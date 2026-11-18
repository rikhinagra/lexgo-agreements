// Usage: pnpm test:security   (the app must be running, default http://localhost:3000)
// Checks the security headers and access rules of a running copy of the app.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
  if (!ok) failed++;
};
const get = (path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init });

// 1. Headers on the public login page
const login = await get("/login");
const html = await login.text();
const h = (n) => login.headers.get(n) ?? "";
const csp = h("content-security-policy");
const scriptSrc = (csp.match(/script-src ([^;]*)/) ?? [])[1] ?? "";
const nonce = (scriptSrc.match(/'nonce-([^']+)'/) ?? [])[1];

check("login page loads", login.status === 200, String(login.status));
check("CSP has a nonce", !!nonce);
check("CSP script-src has no unsafe-inline or wildcard", !/unsafe-inline|\*/.test(scriptSrc), scriptSrc);
check("CSP blocks framing, objects and foreign form posts", /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && /form-action 'self'/.test(csp) && /base-uri 'self'/.test(csp));
check("CSP default-src is self", /default-src 'self'/.test(csp));
check("every script tag carries the nonce", (html.match(/<script\b[^>]*>/g) ?? []).every((t) => t.includes(`nonce="${nonce}"`)), "a script tag has no matching nonce");
const second = await get("/login");
const nonce2 = ((second.headers.get("content-security-policy") ?? "").match(/'nonce-([^']+)'/) ?? [])[1];
check("nonce is different on the second request", !!nonce2 && nonce2 !== nonce);
check("clickjacking blocked (X-Frame-Options)", h("x-frame-options") === "DENY");
check("MIME sniffing blocked", h("x-content-type-options") === "nosniff");
check("referrer is never sent", h("referrer-policy") === "no-referrer");
check("HSTS set", /max-age=\d{7,}/.test(h("strict-transport-security")));
check("cross origin isolation headers", h("cross-origin-opener-policy") === "same-origin" && h("cross-origin-resource-policy") === "same-origin");
check("pages are not cached", /no-store/.test(h("cache-control")));
check("framework name is not announced", !login.headers.has("x-powered-by"));
check("camera, microphone and location are off", /camera=\(\)/.test(h("permissions-policy")) && /microphone=\(\)/.test(h("permissions-policy")));
check("page says nothing about secrets", !/DATABASE_URL|postgresql:\/\/|scrypt\$/.test(html));

// 2. Everything private redirects to the login page when signed out
for (const path of ["/", "/admin", "/admin/mous", "/admin/mous/new", "/admin/mous/some-id", "/admin/mous/some-id/edit"]) {
  const r = await get(path);
  const loc = r.headers.get("location") ?? "";
  check(`signed out ${path} goes to /login`, [307, 308].includes(r.status) && loc.endsWith("/login"), `${r.status} ${loc}`);
  check(`redirect for ${path} leaks no business data`, !/Spectrum|ZZTEST|@[\w-]+\.\w+|Rate per agent|Client email/i.test(await r.text()));
}

// 3. A forged form post from another website is refused
const forged = await get("/login", {
  method: "POST",
  headers: { origin: "https://evil.example", "content-type": "text/plain", "next-action": "0000000000000000000000000000000000000000" },
  body: "[]",
});
check("forged cross site action is refused", forged.status >= 400, String(forged.status));

// 4. Errors reveal nothing
const missing = await get("/no-such-page-xyz");
const missingBody = await missing.text();
check("unknown page is 404 or redirect, no stack trace", [404, 307].includes(missing.status) && !/at \w+ \(|node_modules|\/Users\//.test(missingBody), String(missing.status));
const weird = await get("/admin/mous/%00%27%22%3Cscript%3E");
check("odd characters in a path do not crash the app", weird.status < 500, String(weird.status));

// 5. The secret client link area never answers with real data for a made up token
const fakeToken = "A".repeat(43);
for (const path of ["/mou/not-a-real-token", `/mou/${fakeToken}`, "/mou/%00%27%22%3Cscript%3E"]) {
  const r = await get(path);
  const body = await r.text();
  check(`made up client link ${path.slice(0, 24)} shows only the not valid page`,
    r.status < 500 && /not valid/i.test(body) && !/Memorandum|Sunrise|ZZTEST|signerName/.test(body.replace(/hello@lexgosolutions\.com/g, "")), String(r.status));
}
const fakePage = await get(`/mou/${fakeToken}`);
const fakeCsp = fakePage.headers.get("content-security-policy") ?? "";
check("client page has the strict policy and is not cached", /nonce-/.test(fakeCsp) && /no-store/.test(fakePage.headers.get("cache-control") ?? ""));
check("client page is hidden from search engines", /noindex/.test(await fakePage.text()));

console.log(failed === 0 ? "\nAll security checks passed." : `\n${failed} security check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);

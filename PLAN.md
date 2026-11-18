# LexGo Agreements: Master Plan (living document)

Edit this file whenever the plan changes, and add a line to the change log at the bottom each time.
Detailed rules and decisions are in `docs/SPEC.md`. Original client files are in `docs/reference/`.

**Project:** MOU signing and invoice automation for VA services, to be hosted at `agreements.lexgosolutions.com`.
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, pnpm, Prisma 7, Neon Postgres, Resend. Admin login is our own (see Phase 2 result).
**Mode strategy:** build and demo in TEST MODE first. Switch to LIVE MODE only after the client signs off.

## Modes
| | TEST MODE (now) | LIVE MODE (after approval) |
|---|---|---|
| Emails | Go to test inboxes only | Real client and admin addresses |
| Banner | "TEST MODE" on every page, invoices marked TEST | None |
| Database | Neon test database | Fresh production database |
| Monthly job | A "run billing as of this date" button simulates time | Real schedule, 1st of month at about 9 AM Pacific |
| Payments | Admin marks an invoice paid | Same, online payment later |

The switch is one environment variable (`APP_MODE=test` or `live`) plus real keys. No code change.

## Phases and status
| # | Phase | Status |
|---|---|---|
| 0 | Scaffold, spec, plan, pnpm | Done |
| 1 | Database schema, billing logic, unit tests | Done (2026-11-13) |
| 2 | Admin login, create MOU form, MOU list, security hardening | Done (2026-11-13) |
| 3 | Client MOU page: secure link, questions, signing (one signer, others get a copy) | Done (2026-11-18) with editing and a cancel pop-up, email code check moves to Phase 4 |
| 4 | Emails (Resend): Send to client emails the link, email code check before signing, all 3 admins emailed at signing and on questions, signed MOU PDF | Next |
| 5 | Invoices as drafts only: draft at signing, draft on the 1st, admins review then click Send invoice, payment status | Not started |
| 6 | Contract changes: add or remove agents, termination | Not started |
| 7 | Test mode demo to the client, feedback, fixes | Not started |
| 8 | Go live: production setup, DNS, real keys, switch to LIVE | Not started |

## Phase 1 result (what exists now)
- **Database tables** on Neon: Admin, Setting, Client, Mou, Question, AgentChange, Invoice, InvoiceSequence, EmailLog, AuditLog. Money is stored as whole cents. Calendar days are stored as DATE.
- **Billing logic** in `src/lib/billing/`: Pacific timezone day detection, pro rating, invoice schedule (advance and arrears), invoice numbering (`INV-YYYY-MM-NNN`), money helpers.
- **Safety:** one invoice per contract per month per kind, enforced by the database. Invoice numbers are gapless and safe when two invoices are created at once.
- **Tests:** 36 unit tests pass. A temporary database check also passed (parallel numbering, rollback, duplicate guard), then its data was removed.
- **Seed data** in the test database: 10 default settings and 3 test admins.
- **Known limits for later:** pro rating for mid month agent changes is Phase 6. Tax is fixed at $0 for now.

## Phase 2 result (what exists now)
- **Screens:** `/login`, `/admin/mous` (list, search, status filter, paging), `/admin/mous/new` (create form with validation), `/admin/mous/[id]` (terms, client link, history).
- **Admin login:** own email and password system instead of Auth.js. Passwords use scrypt. Sessions live in the database and the cookie holds a random token whose hash is stored. Sessions last 12 hours.
- **Client link:** random 256 bit token, only its hash is stored, so the link is shown once. An admin can make a new link (the old one stops) or cancel an unsigned MOU.
- **Tests:** 51 unit tests, 22 integration tests against Neon, and a 32 point security smoke check (`pnpm test:security`, needs the app running).
- **Checked in a real browser:** login, empty list, form defaults, validation errors, creating a MOU, detail page, sign out, redirect when signed out. All worked. Temporary test data was removed afterwards.

## Phase 3 result (what exists now)
- **Client page** `/mou/[token]`: shows the MOU with the client's company, agents and rate filled in. Wording comes from the sample MOU. The first invoice amount shown is for signing today.
- **Link rules:** 30 days. Only the hash is stored. A bad, expired or cancelled link shows a plain message and no data. The page is hidden from search engines and never cached.
- **Status:** Draft, then Sent when an admin clicks Send to client, then Viewed on first open, then Signed.
- **Questions:** saved with the reply email. Limits: 3 per hour per MOU, 20 per MOU, 10 per hour per network address, plus a hidden field that catches bots.
- **Signing:** name, title, email and phone are required, second email and phone are optional, the typed name must match, and the agree box must be ticked. The signing time in Pacific becomes the start date. Saved with the signature: IP address, device, MOU version, and a fingerprint of the exact text. Two people signing at once cannot both succeed.
- **Several emails:** one main email who signs plus up to 5 copy emails, with an Add another email button.
- **Send to client:** makes a fresh link each time, because only a scrambled copy of a link is stored. Until Phase 4, the admin copies the link and shares it. Phase 4 emails it.
- **Provider signatory:** Rikhi Singh, Authorized Signatory, company LexGo Solutions. All changeable in settings.
- **Tests:** 63 unit, 36 integration, 36 security checks pass. Checked in a browser at phone, tablet and laptop sizes.
- **Editing:** every MOU that is not signed has an Edit button. A Draft just saves. A Sent or Viewed MOU stops its old link when something changes, goes back to Draft, and must be sent again. Saving with no changes does nothing. Signed and cancelled MOUs are locked. Questions are kept. The history records what changed.
- **Cancel pop-up:** a proper confirmation pop-up replaces the plain browser box.
- **Not done yet (by plan):** email code check and all emails (Phase 4), invoices (Phase 5).
- **Known limits:** a link preview robot (for example in a chat app) can mark a MOU as Viewed. The signed copy stays visible to anyone holding the link.

## UI redesign (done 2026-11-13, before Phase 3)
- **Colors from lexgosolutions.com:** navy `#0A1F44`, gold `#D4AF37`, cream `#F8F6F1`, slate `#475569`, light gold `#E8D4A0`, dark navy `#050F24`.
- **Font:** Inter everywhere. The owner did not like the website fonts (Playfair Display and Work Sans) in this app, so they are not used. Inter loads through `next/font`, so it is served from our own server and fits the strict security policy.
- **Test and Live labels are not shown anywhere in the screens**, by the owner's choice, so nobody is confused during the demo. This includes the old Mode row on the MOU page. The `APP_MODE` setting and the stored test flag on each MOU still control behavior behind the scenes.
- **No developer notes in the screens.** The temporary line about emailing and the client page was removed.
- **Login:** two column layout with a navy brand panel, show password button and a loading state.
- **Admin:** navy header with active tab underline, avatar and sign out. MOU list has summary cards, search, a clean table, an empty state and paging. The new MOU form has three sections and a "How it works" panel. The detail page has cards and a history timeline.
- **Skeleton loading screens** for the list, form and detail pages, so the screen is never blank while data loads.
- **Phone friendly.** Checked at phone width.
- **Checked in the production build** with the strict security policy: no browser errors, 32 security checks pass.
- Lesson learned: entrance animations must never start fully invisible, because a paused animation would hide content.

## Responsive design and icons (done 2026-11-13)
- **Tested again in full at** 360, 375, 430 (phones), 768 (iPad mini), 834 (iPad Pro 11 inch), 1180 (iPad landscape and laptop), with long names, a long question, an invoice and a history entry. Earlier passes also covered 320, 390, 1024 and 1440. No sideways scrolling on any screen. Login, MOU list, new MOU form, success screen and MOU details were all checked.
- **Phones and tablets:** the MOU list becomes easy to tap cards (nothing is cut off). Laptops and desktops get the full table. Long company names and emails wrap instead of stretching the page.
- **Touch friendly:** every button and link is at least 44 pixels tall, the size Apple and Google recommend.
- **No iPhone zoom:** text fields use 16 pixel type on phones, so iPhones do not zoom in when you tap a field.
- **Phone browser bar** is colored navy to match the header.
- **Icons:** all icons come from the Lucide library, through one file `src/components/icons.tsx`. No emoji anywhere. A scan found no emoji or special symbols in the interface code.
- **Login page on every size:** the navy brand area now shows on phones and iPad mini as a header at the top with a navy strip at the bottom, and on laptops as the left panel. The sign in card overlaps the navy area on small screens.
- **Final pass fixes:** the sign out button is a full 44 pixels on tablets, the Clear filter link is a full touch target, and dates in the history and questions stay on their own line instead of breaking in the middle.
- **Form controls:** every dropdown uses one `SelectField` component with a Lucide arrow placed with proper space from the edge (the browser's own arrow sat on the border). The tiny up and down arrows inside number boxes are hidden everywhere. Rule: never use a raw `select` element.
- **Not tested on real devices.** Screen sizes were simulated in a browser. Before the client demo, open it once on a real iPhone and a real Android phone.

## Security measures in place
- **Passwords:** scrypt hashing, 12 character minimum, never logged or stored in plain text.
- **Brute force:** an account locks for 15 minutes after 5 wrong passwords. Each network address is limited to 20 failures per 15 minutes. All failures show one identical message, and unknown emails take the same time as real ones.
- **Sessions:** HttpOnly, SameSite Lax, Secure on https, `__Host-` cookie name in production, deleted from the database on sign out or admin deactivation.
- **Every admin page and every server action checks the session itself**, not only the layout.
- **Content Security Policy** with a new nonce per request. Scripts without the nonce cannot run. Framing, plugins, foreign form posts and base tag changes are blocked.
- **Other headers:** HSTS, no sniffing, no referrer, no framing, cross origin isolation, no caching of private pages, framework name hidden.
- **Forms:** all input checked with zod on the server. Database access uses Prisma only, with no raw SQL in app code. No use of `dangerouslySetInnerHTML` or `eval`.
- **Forged posts from other websites** are refused by Next.js origin checks. Request bodies are limited to 100 KB.
- **Audit log** for logins, failures, locks, MOU creation, link changes and cancellations.
- **Dependencies:** `pnpm audit` found no known vulnerabilities. `.env.local` is git ignored and no secrets are tracked.

## Security still to do
- Two step sign in (authenticator app) for admins, in Phase 8.
- Email code check before signing, in Phase 3.
- Run `pnpm audit` before every release, and set up automatic dependency alerts on GitHub.
- Backups and database access review before go live.
- Confirm the proxy forwards the real client IP on the final host, because the per address limit depends on it.
- Consider a Neon database region closer to the main users. From India each database call takes about 0.26 seconds, which makes local testing feel slow. A deployed app next to the database will be fast.

## What we need from the owner (Chandan)
Done already:
1. Neon account and test database connection (saved in `.env.local`).
2. Test email addresses (saved in `.env.local`).

Needed later:
3. Resend account and API key, created with `chandan.g@aadhcode.com`, before Phase 4.
4. Vercel account and a private GitHub repository for a demo link, before Phase 7.
5. DNS access for `lexgosolutions.com`, at go live.
6. Real signatory name and title, company legal name, payment method text, governing law, at go live.
7. Client confirmation of advance billing, the $1,800 default rate and the pay to start clause.
8. A hosting plan decision. Vercel Hobby is non commercial, so use Vercel Pro or a GitHub Actions schedule.

Accounts should belong to the company. Keys go in `.env.local` and are never committed.

## Change log
- 2026-11-13: Plan created. Switched npm to pnpm. Decisions made: advance billing, Pacific timezone, $1,800 default, Neon, subdomain `agreements`, test mode first.
- 2026-11-13: Responsive audit and fixes at all screen sizes, Lucide icons, no emoji rule.
- 2026-11-13: Fonts changed to Inter and test mode label removed from the screens, at the owner's request.
- 2026-11-13: UI redesign with LexGo brand colors, skeleton loaders. Development mode uses a looser style policy because Next dev tools add inline styles, production stays strict.
- 2026-11-13: Phase 2 completed with security hardening. Added Session and LoginAttempt tables, CSP proxy, scripts `admin:set-password` and `test:security`. Turned off the scaffold's cacheComponents option because the admin area is fully dynamic.
- 2026-11-13: Phase 1 completed. Prisma 7.10.1 pinned (a release candidate of the CLI was avoided). Added `DIRECT_URL` for migrations.
- 2026-11-18: Client changes agreed. MOU can go to several client emails (one signer, the rest get a copy). Admin reviews then clicks Send to client. All 3 admins are emailed at signing. Invoices are never sent automatically: the app prepares drafts, an admin reviews and clicks Send invoice.
- 2026-11-18: Phase 3 completed (client page, questions, signing, copy emails, Send to client). Start date shown one day early was fixed (calendar dates have no timezone shift).
- 2026-11-18: Added editing of unsigned MOUs and a professional cancel pop-up.

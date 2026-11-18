import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { cleanupTestData, TEST_COMPANY_PREFIX } from "../testing/db-helpers";
import { parseCreateMou, parseWith, signMouSchema } from "../validation/mou";
import {
  askQuestion, documentForMou, lookupByToken, QUESTION_LIMIT_PER_IP_PER_HOUR, QUESTION_LIMIT_PER_MOU_PER_HOUR,
  recordView, signMou,
} from "./client-mou";
import { createMou, sendToClient } from "./mou";

const actor = { email: "zztest-actor@example.com", ip: "9.9.9.9" };
const meta = { ip: "203.0.113.7", userAgent: "ZZTEST browser" };

async function makeMou(name: string, cc: string[] = []) {
  const parsed = parseCreateMou({
    companyName: TEST_COMPANY_PREFIX + name, agents: "2", rate: "1800", clientEmail: `client-${name}@example.com`,
    ccEmails: cc, billingMode: "ADVANCE", paymentDueDays: "7", governingLaw: "State of California", paymentMethod: "Bank transfer",
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.fieldErrors));
  return createMou(parsed.value, actor);
}

function signInput(name = "Maria Lopez") {
  const r = parseWith(signMouSchema, {
    signerName: name, signerTitle: "Owner", signerEmail1: "maria@example.com", signerPhone1: "555 123 4567",
    signerEmail2: "", signerPhone2: "", signatureTyped: name, agree: "on",
  });
  if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
  return r.value;
}

beforeAll(async () => {
  await cleanupTestData();
  await prisma.$queryRaw`select 1`;
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("client link lookup", () => {
  it("opens with the right token, refuses wrong or odd tokens", async () => {
    const { token } = await makeMou("lookup");
    expect((await lookupByToken(token)).state).toBe("open");
    expect((await lookupByToken("x".repeat(43))).state).toBe("not_found");
    expect((await lookupByToken("short")).state).toBe("not_found");
    expect((await lookupByToken("../../etc/passwd")).state).toBe("not_found");
  });
  it("reports an expired link", async () => {
    const { token } = await makeMou("expired");
    const later = new Date(Date.now() + 31 * 86_400_000);
    expect((await lookupByToken(token, later)).state).toBe("expired");
  });
  it("reports a cancelled MOU", async () => {
    const { mou, token } = await makeMou("cancelled");
    await prisma.mou.update({ where: { id: mou.id }, data: { status: "CANCELLED", tokenRevokedAt: new Date() } });
    expect((await lookupByToken(token)).state).toBe("cancelled");
  });
  it("marks Viewed once, with one audit entry, however many times it is opened", async () => {
    const { mou, token } = await makeMou("view");
    for (let i = 0; i < 3; i++) {
      const found = await lookupByToken(token);
      if (found.state === "open") await recordView(found.mou, "1.1.1.1");
    }
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    expect(row.status).toBe("VIEWED");
    expect(row.viewedAt).not.toBeNull();
    const logs = await prisma.auditLog.count({ where: { entityId: mou.id, action: "mou.viewed" } });
    expect(logs).toBe(1);
  });
});

describe("sendToClient", () => {
  it("makes a fresh link, stops the old one, and marks the MOU Sent with all recipients", async () => {
    const { mou, token: oldToken } = await makeMou("send", ["copy1@example.com", "copy2@example.com"]);
    const sent = await sendToClient(mou.id, actor);
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.value.emails).toEqual([`client-send@example.com`, "copy1@example.com", "copy2@example.com"]);
    expect((await lookupByToken(oldToken)).state).toBe("not_found");
    expect((await lookupByToken(sent.value.token)).state).toBe("open");
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    expect(row.status).toBe("SENT");
    expect(row.sentAt).not.toBeNull();
    expect(row.ccEmails).toEqual(["copy1@example.com", "copy2@example.com"]);
  });
  it("refuses once signed", async () => {
    const { mou, token } = await makeMou("sendsigned");
    expect((await signMou(token, signInput(), meta)).ok).toBe(true);
    expect((await sendToClient(mou.id, actor)).ok).toBe(false);
  });
});

describe("signMou", () => {
  it("signs, records everything, and uses the Pacific day as the start date", async () => {
    const { mou, token } = await makeMou("sign");
    // 2026-11-04 03:30 UTC is still Nov 3 in Pacific time.
    const now = new Date("2026-11-04T03:30:00Z");
    const r = await signMou(token, signInput(), meta, now);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.startDate).toBe("2026-11-03");
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    expect(row.status).toBe("SIGNED");
    expect(row.signerName).toBe("Maria Lopez");
    expect(row.signatureTyped).toBe("Maria Lopez");
    expect(row.signerIp).toBe(meta.ip);
    expect(row.signerUserAgent).toBe(meta.userAgent);
    expect(row.termsVersion).toBe("2026-11-v1");
    expect(row.documentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.providerSignatoryName).toBeTruthy();
    expect(row.startDate?.toISOString().slice(0, 10)).toBe("2026-11-03");
    const logs = await prisma.auditLog.count({ where: { entityId: mou.id, action: "mou.signed" } });
    expect(logs).toBe(1);
  });
  it("the link now shows the signed copy and a second signing is refused", async () => {
    const { token } = await makeMou("twice");
    expect((await signMou(token, signInput(), meta)).ok).toBe(true);
    const again = await signMou(token, signInput("Someone Else"), meta);
    expect(again.ok).toBe(false);
    const found = await lookupByToken(token);
    expect(found.state).toBe("signed");
    if (found.state === "signed") {
      const doc = await documentForMou(found.mou);
      expect(doc.signatures.client.name).toBe("Maria Lopez");
    }
  });
  it("two people signing at the same moment: exactly one wins", async () => {
    const { mou, token } = await makeMou("race");
    const results = await Promise.all([
      signMou(token, signInput("First Person"), meta),
      signMou(token, signInput("Second Person"), meta),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const logs = await prisma.auditLog.count({ where: { entityId: mou.id, action: "mou.signed" } });
    expect(logs).toBe(1);
  });
  it("refuses an expired, cancelled or unknown link", async () => {
    const a = await makeMou("signexp");
    expect((await signMou(a.token, signInput(), meta, new Date(Date.now() + 31 * 86_400_000))).ok).toBe(false);
    const b = await makeMou("signcancel");
    await prisma.mou.update({ where: { id: b.mou.id }, data: { status: "CANCELLED", tokenRevokedAt: new Date() } });
    expect((await signMou(b.token, signInput(), meta)).ok).toBe(false);
    expect((await signMou("y".repeat(43), signInput(), meta)).ok).toBe(false);
  });
});

describe("askQuestion", () => {
  const q = { body: "Can we add a third agent later?", replyEmail: "maria@example.com" };
  it("saves the question and writes an audit entry", async () => {
    const { mou, token } = await makeMou("q1");
    expect((await askQuestion(token, q, meta)).ok).toBe(true);
    const rows = await prisma.question.findMany({ where: { mouId: mou.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].replyEmail).toBe("maria@example.com");
    expect(rows[0].ip).toBe(meta.ip);
  });
  it("stops spam: limit per MOU per hour", async () => {
    const { mou, token } = await makeMou("q2");
    for (let i = 0; i < QUESTION_LIMIT_PER_MOU_PER_HOUR; i++) {
      expect((await askQuestion(token, q, { ip: `198.51.100.${i}`, userAgent: null })).ok).toBe(true);
    }
    expect((await askQuestion(token, q, { ip: "198.51.100.99", userAgent: null })).ok).toBe(false);
    expect(await prisma.question.count({ where: { mouId: mou.id } })).toBe(QUESTION_LIMIT_PER_MOU_PER_HOUR);
  });
  it("stops spam: limit per network address across MOUs", async () => {
    const ip = "192.0.2.55";
    const first = await makeMou("qip1");
    const second = await makeMou("qip2");
    // Ten recent questions from this address, spread over time, are already on record.
    await prisma.question.createMany({
      data: Array.from({ length: QUESTION_LIMIT_PER_IP_PER_HOUR }, (_, i) => ({
        mouId: first.mou.id, body: `Earlier question number ${i}`, replyEmail: "a@b.com", ip,
      })),
    });
    // A different MOU, same address: refused. A different address: still fine.
    expect((await askQuestion(second.token, q, { ip, userAgent: null })).ok).toBe(false);
    expect((await askQuestion(second.token, q, { ip: "192.0.2.56", userAgent: null })).ok).toBe(true);
  });
  it("refuses questions after signing or on a bad link", async () => {
    const { token } = await makeMou("q3");
    await signMou(token, signInput(), meta);
    expect((await askQuestion(token, q, meta)).ok).toBe(false);
    expect((await askQuestion("z".repeat(43), q, meta)).ok).toBe(false);
  });
});

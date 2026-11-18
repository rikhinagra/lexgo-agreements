import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { cleanupTestData, TEST_COMPANY_PREFIX } from "../testing/db-helpers";
import { parseCreateMou, parseWith, signMouSchema } from "../validation/mou";
import { lookupByToken, recordView, signMou } from "./client-mou";
import { cancelMou, createMou, sendToClient, updateMou } from "./mou";

const actor = { email: "zztest-actor@example.com", ip: "9.9.9.9" };

function form(name: string, extra: Record<string, unknown> = {}) {
  const r = parseCreateMou({
    companyName: TEST_COMPANY_PREFIX + name, agents: "2", rate: "1800", clientEmail: `client-${name}@example.com`,
    ccEmails: [], billingMode: "ADVANCE", paymentDueDays: "7", governingLaw: "California", paymentMethod: "Bank",
    ...extra,
  });
  if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
  return r.value;
}
const signInput = () => {
  const r = parseWith(signMouSchema, {
    signerName: "Maria Lopez", signerTitle: "Owner", signerEmail1: "maria@example.com", signerPhone1: "555 123 4567",
    signerEmail2: "", signerPhone2: "", signatureTyped: "Maria Lopez", agree: "on",
  });
  if (!r.ok) throw new Error("bad");
  return r.value;
};

beforeAll(async () => {
  await cleanupTestData();
  await prisma.$queryRaw`select 1`;
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("updateMou", () => {
  it("edits a Draft: saves the terms, keeps the status, writes an audit entry with the changes", async () => {
    const { mou } = await createMou(form("draft"), actor);
    const r = await updateMou(mou.id, form("draft", { agents: "5", rate: "1600", clientEmail: "new@example.com", ccEmails: ["c1@example.com"], companyName: TEST_COMPANY_PREFIX + "draft renamed" }), actor);
    expect(r.ok && r.value.linkStopped).toBe(false);
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id }, include: { client: true } });
    expect(row.status).toBe("DRAFT");
    expect(row.agents).toBe(5);
    expect(row.rateCents).toBe(160_000);
    expect(row.clientEmail).toBe("new@example.com");
    expect(row.ccEmails).toEqual(["c1@example.com"]);
    expect(row.client.companyName).toBe(TEST_COMPANY_PREFIX + "draft renamed");
    const logs = await prisma.auditLog.findMany({ where: { entityId: mou.id, action: "mou.edited" } });
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs[0].detail)).toContain("VA agents");
  });

  it("saving with no changes does nothing, not even an audit entry, and keeps a sent link working", async () => {
    const { mou } = await createMou(form("nochange"), actor);
    const sent = await sendToClient(mou.id, actor);
    if (!sent.ok) throw new Error("send");
    const r = await updateMou(mou.id, form("nochange"), actor);
    expect(r.ok && r.value.changes).toEqual([]);
    expect((await lookupByToken(sent.value.token)).state).toBe("open");
    expect(await prisma.auditLog.count({ where: { entityId: mou.id, action: "mou.edited" } })).toBe(0);
  });

  it("editing a Sent MOU stops the old link, goes back to Draft and clears sent and viewed times", async () => {
    const { mou } = await createMou(form("sent"), actor);
    const sent = await sendToClient(mou.id, actor);
    if (!sent.ok) throw new Error("send");
    const found = await lookupByToken(sent.value.token);
    if (found.state === "open") await recordView(found.mou, null);
    expect((await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } })).status).toBe("VIEWED");

    const r = await updateMou(mou.id, form("sent", { agents: "4" }), actor);
    expect(r.ok && r.value.linkStopped).toBe(true);
    expect((await lookupByToken(sent.value.token)).state).toBe("not_found");
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    expect(row.status).toBe("DRAFT");
    expect(row.sentAt).toBeNull();
    expect(row.viewedAt).toBeNull();
    expect(row.agents).toBe(4);

    // Sending again gives a working link with the new terms.
    const again = await sendToClient(mou.id, actor);
    if (!again.ok) throw new Error("send again");
    const open = await lookupByToken(again.value.token);
    expect(open.state === "open" && open.mou.agents).toBe(4);
  });

  it("keeps questions after an edit", async () => {
    const { mou } = await createMou(form("keepq"), actor);
    await prisma.question.create({ data: { mouId: mou.id, body: "Can we add an agent later?", replyEmail: "a@b.com" } });
    await updateMou(mou.id, form("keepq", { agents: "3" }), actor);
    expect(await prisma.question.count({ where: { mouId: mou.id } })).toBe(1);
  });

  it("refuses a signed MOU and a cancelled MOU, and changes nothing", async () => {
    const signedMou = await createMou(form("locked"), actor);
    const sent = await sendToClient(signedMou.mou.id, actor);
    if (!sent.ok) throw new Error("send");
    expect((await signMou(sent.value.token, signInput(), { ip: null, userAgent: null })).ok).toBe(true);
    const r1 = await updateMou(signedMou.mou.id, form("locked", { agents: "9" }), actor);
    expect(r1.ok).toBe(false);
    expect((await prisma.mou.findUniqueOrThrow({ where: { id: signedMou.mou.id } })).agents).toBe(2);

    const cancelled = await createMou(form("cancelled"), actor);
    await cancelMou(cancelled.mou.id, actor);
    expect((await updateMou(cancelled.mou.id, form("cancelled", { agents: "9" }), actor)).ok).toBe(false);
    expect((await updateMou("does-not-exist", form("x"), actor)).ok).toBe(false);
  });

  it("an edit and a signing at the same moment never both win", async () => {
    const { mou } = await createMou(form("race"), actor);
    const sent = await sendToClient(mou.id, actor);
    if (!sent.ok) throw new Error("send");
    const [edit, sign] = await Promise.all([
      updateMou(mou.id, form("race", { agents: "7" }), actor),
      signMou(sent.value.token, signInput(), { ip: null, userAgent: null }),
    ]);
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    if (sign.ok) {
      // Signed first, so the edit must have been refused and the signed terms untouched.
      expect(row.status).toBe("SIGNED");
      expect(row.agents).toBe(2);
      expect(edit.ok).toBe(false);
    } else {
      // The edit won, which stopped the old link, so the signing was refused.
      expect(edit.ok).toBe(true);
      expect(row.status).toBe("DRAFT");
      expect(row.agents).toBe(7);
    }
  });
});

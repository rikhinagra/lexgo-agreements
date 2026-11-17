import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { hashToken } from "../auth/token";
import { parseCreateMou } from "../validation/mou";
import { cleanupTestData, TEST_COMPANY_PREFIX } from "../testing/db-helpers";
import { buildMouLink, cancelMou, createMou, displayStatus, getMouDetail, listMous, regenerateLink } from "./mou";
import { getSettings } from "./settings";

const actor = { email: "zztest-actor@example.com", ip: "9.9.9.9" };

function input(name: string, extra: Record<string, string> = {}) {
  const parsed = parseCreateMou({
    companyName: TEST_COMPANY_PREFIX + name,
    agents: "3",
    rate: "1800",
    clientEmail: `client-${name}@example.com`,
    billingMode: "ADVANCE",
    paymentDueDays: "7",
    governingLaw: "State of California",
    paymentMethod: "Bank transfer",
    customScope: "",
    linkExpiryDays: "14",
    ...extra,
  });
  if (!parsed.ok) throw new Error("test input invalid: " + JSON.stringify(parsed.fieldErrors));
  return parsed.value;
}

beforeAll(async () => {
  await cleanupTestData();
  await prisma.$queryRaw`select 1`;
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("createMou", () => {
  it("creates a draft MOU, stores only the token hash, and writes an audit entry", async () => {
    const now = new Date();
    const { mou, token } = await createMou(input("create"), actor, now);
    expect(mou.status).toBe("DRAFT");
    expect(mou.isTest).toBe(true);
    expect(mou.agents).toBe(3);
    expect(mou.rateCents).toBe(180_000);
    expect(mou.tokenHash).toBe(hashToken(token));
    expect(mou.tokenHash).not.toBe(token);
    expect(mou.tokenExpiresAt.getTime()).toBe(now.getTime() + 14 * 86_400_000);
    const logs = await prisma.auditLog.findMany({ where: { entityType: "Mou", entityId: mou.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("mou.created");
    expect(logs[0].actor).toBe(actor.email);
    expect(JSON.stringify(logs[0])).not.toContain(token);
  });
  it("gives every MOU a different link", async () => {
    const a = await createMou(input("a"), actor);
    const b = await createMou(input("b"), actor);
    expect(a.token).not.toBe(b.token);
    expect(a.mou.tokenHash).not.toBe(b.mou.tokenHash);
  });
  it("builds the client link from APP_URL", () => {
    const old = process.env.APP_URL;
    process.env.APP_URL = "https://agreements.lexgosolutions.com/";
    expect(buildMouLink("abc")).toBe("https://agreements.lexgosolutions.com/mou/abc");
    process.env.APP_URL = old;
  });
});

describe("regenerateLink", () => {
  it("makes the old link stop working and the new one work", async () => {
    const { mou, token } = await createMou(input("regen"), actor);
    const r = await regenerateLink(mou.id, actor, 30);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await prisma.mou.findUnique({ where: { tokenHash: hashToken(token) } })).toBeNull();
    const fresh = await prisma.mou.findUnique({ where: { tokenHash: hashToken(r.value.token) } });
    expect(fresh?.id).toBe(mou.id);
  });
  it("is refused after signing or cancelling, and for unknown ids", async () => {
    const signed = await createMou(input("signed"), actor);
    await prisma.mou.update({ where: { id: signed.mou.id }, data: { status: "SIGNED" } });
    expect((await regenerateLink(signed.mou.id, actor)).ok).toBe(false);
    const cancelled = await createMou(input("cancelled1"), actor);
    await cancelMou(cancelled.mou.id, actor);
    expect((await regenerateLink(cancelled.mou.id, actor)).ok).toBe(false);
    expect((await regenerateLink("does-not-exist", actor)).ok).toBe(false);
  });
});

describe("cancelMou", () => {
  it("cancels an unsigned MOU once, and revokes the link", async () => {
    const { mou } = await createMou(input("cancel"), actor);
    expect((await cancelMou(mou.id, actor)).ok).toBe(true);
    const row = await prisma.mou.findUniqueOrThrow({ where: { id: mou.id } });
    expect(row.status).toBe("CANCELLED");
    expect(row.tokenRevokedAt).not.toBeNull();
    expect((await cancelMou(mou.id, actor)).ok).toBe(false);
  });
  it("cannot cancel a signed MOU", async () => {
    const { mou } = await createMou(input("cancelsigned"), actor);
    await prisma.mou.update({ where: { id: mou.id }, data: { status: "ACTIVE" } });
    expect((await cancelMou(mou.id, actor)).ok).toBe(false);
  });
});

describe("displayStatus", () => {
  it("shows EXPIRED only for unsigned MOUs whose link has run out", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 100_000);
    expect(displayStatus({ status: "SENT", tokenExpiresAt: past })).toBe("EXPIRED");
    expect(displayStatus({ status: "SENT", tokenExpiresAt: future })).toBe("SENT");
    expect(displayStatus({ status: "ACTIVE", tokenExpiresAt: past })).toBe("ACTIVE");
    expect(displayStatus({ status: "CANCELLED", tokenExpiresAt: past })).toBe("CANCELLED");
  });
});

describe("listMous and getMouDetail", () => {
  it("filters by status and by search text, newest first", async () => {
    await createMou(input("list-one"), actor);
    const two = await createMou(input("list-two"), actor);
    await cancelMou(two.mou.id, actor);

    const search = await listMous({ search: "ZZTEST list-" });
    expect(search.rows.length).toBe(2);
    expect(search.rows[0].createdAt.getTime()).toBeGreaterThanOrEqual(search.rows[1].createdAt.getTime());

    const cancelled = await listMous({ status: "CANCELLED", search: "ZZTEST list-" });
    expect(cancelled.rows.map((r) => r.id)).toEqual([two.mou.id]);

    const byEmail = await listMous({ search: "client-list-one@example.com" });
    expect(byEmail.total).toBe(1);

    const none = await listMous({ search: "no such company anywhere" });
    expect(none.total).toBe(0);
    expect(none.pageCount).toBe(1);
  });
  it("returns the full detail with history, or null", async () => {
    const { mou } = await createMou(input("detail"), actor);
    await regenerateLink(mou.id, actor);
    const detail = await getMouDetail(mou.id);
    expect(detail?.mou.client.companyName).toBe(TEST_COMPANY_PREFIX + "detail");
    expect(detail?.history.map((h) => h.action)).toEqual(["mou.link_regenerated", "mou.created"]);
    expect(await getMouDetail("does-not-exist")).toBeNull();
  });
});

describe("settings", () => {
  it("reads the seeded defaults", async () => {
    const s = await getSettings();
    expect(s.defaultRateCents).toBe(180_000);
    expect(s.defaultBillingMode).toBe("ADVANCE");
    expect(s.businessTimezone).toBe("America/Los_Angeles");
  });
});

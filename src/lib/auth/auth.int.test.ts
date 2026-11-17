import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { cleanupTestData, makeTestAdmin } from "../testing/db-helpers";
import { LOCK_MINUTES, MAX_FAILED_LOGINS, verifyLogin } from "./login";
import { createSessionRecord, deleteSessionByToken, findValidSession, SESSION_HOURS } from "./session-store";
import { hashToken } from "./token";

const PASSWORD = "a strong test password";

beforeAll(async () => {
  await cleanupTestData();
  await prisma.$queryRaw`select 1`; // wake the database
});
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("verifyLogin", () => {
  it("accepts the right password and records the login", async () => {
    const admin = await makeTestAdmin("ok");
    const r = await verifyLogin(admin.email, PASSWORD);
    expect(r.ok).toBe(true);
    const row = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(row.lastLoginAt).not.toBeNull();
    expect(row.failedLogins).toBe(0);
  });
  it("ignores email capitalization and surrounding spaces", async () => {
    const admin = await makeTestAdmin("case");
    expect((await verifyLogin(`  ${admin.email.toUpperCase()} `, PASSWORD)).ok).toBe(true);
  });
  it("rejects a wrong password, an unknown email, no password set, and an inactive admin", async () => {
    const admin = await makeTestAdmin("bad");
    expect((await verifyLogin(admin.email, "wrong password!!")).ok).toBe(false);
    expect((await verifyLogin("zztest-nobody@example.com", PASSWORD)).ok).toBe(false);
    const noPw = await makeTestAdmin("nopw", null);
    expect((await verifyLogin(noPw.email, PASSWORD)).ok).toBe(false);
    const off = await makeTestAdmin("off");
    await prisma.admin.update({ where: { id: off.id }, data: { active: false } });
    expect((await verifyLogin(off.email, PASSWORD)).ok).toBe(false);
  });
  it("locks after 5 wrong attempts, even for the right password, then unlocks later", async () => {
    const admin = await makeTestAdmin("lock");
    const start = new Date();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      expect((await verifyLogin(admin.email, "wrong password!!", start)).ok).toBe(false);
    }
    const locked = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(locked.lockedUntil).not.toBeNull();
    // Right password while locked is still refused.
    expect((await verifyLogin(admin.email, PASSWORD, start)).ok).toBe(false);
    // After the lock time passes, it works again.
    const later = new Date(start.getTime() + (LOCK_MINUTES + 1) * 60_000);
    expect((await verifyLogin(admin.email, PASSWORD, later)).ok).toBe(true);
    const after = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(after.lockedUntil).toBeNull();
  });
  it("resets the failed counter after a good login", async () => {
    const admin = await makeTestAdmin("reset");
    await verifyLogin(admin.email, "wrong password!!");
    await verifyLogin(admin.email, "wrong password!!");
    await verifyLogin(admin.email, PASSWORD);
    const row = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(row.failedLogins).toBe(0);
  });
  it("writes audit entries without ever storing the password", async () => {
    const admin = await makeTestAdmin("audit");
    await verifyLogin(admin.email, "wrong password!!");
    await verifyLogin(admin.email, PASSWORD);
    const logs = await prisma.auditLog.findMany({ where: { entityType: "Admin", entityId: admin.id } });
    expect(logs.map((l) => l.action).sort()).toEqual(["login.failed", "login.success"]);
    expect(JSON.stringify(logs)).not.toContain("wrong password");
    expect(JSON.stringify(logs)).not.toContain(PASSWORD);
  });
});

describe("sessions", () => {
  it("stores only a hash and finds the admin for a valid token", async () => {
    const admin = await makeTestAdmin("s1");
    const { token } = await createSessionRecord(admin.id, { ip: "1.2.3.4", userAgent: "test" });
    const stored = await prisma.session.findFirstOrThrow({ where: { adminId: admin.id } });
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
    const found = await findValidSession(token);
    expect(found?.admin.id).toBe(admin.id);
  });
  it("rejects unknown, empty, tampered and over long tokens", async () => {
    const admin = await makeTestAdmin("s2");
    const { token } = await createSessionRecord(admin.id);
    expect(await findValidSession(undefined)).toBeNull();
    expect(await findValidSession("")).toBeNull();
    expect(await findValidSession(token + "x")).toBeNull();
    expect(await findValidSession("x".repeat(500))).toBeNull();
  });
  it("expires after the session length", async () => {
    const admin = await makeTestAdmin("s3");
    const now = new Date();
    const { token } = await createSessionRecord(admin.id, {}, now);
    const justBefore = new Date(now.getTime() + (SESSION_HOURS * 60 - 1) * 60_000);
    const justAfter = new Date(now.getTime() + (SESSION_HOURS * 60 + 1) * 60_000);
    expect(await findValidSession(token, justBefore)).not.toBeNull();
    expect(await findValidSession(token, justAfter)).toBeNull();
  });
  it("stops working after logout or when the admin is deactivated", async () => {
    const admin = await makeTestAdmin("s4");
    const a = await createSessionRecord(admin.id);
    await deleteSessionByToken(a.token);
    expect(await findValidSession(a.token)).toBeNull();
    const b = await createSessionRecord(admin.id);
    await prisma.admin.update({ where: { id: admin.id }, data: { active: false } });
    expect(await findValidSession(b.token)).toBeNull();
  });
});

describe("per address login limit", () => {
  it("blocks an address after too many failures, per address, and clears old records", async () => {
    const { IP_MAX_FAILURES, IP_WINDOW_MINUTES, isIpBlocked, purgeOldAttempts, recordFailedAttempt } = await import("./rate-limit");
    const ip = `zztest-ip-${Date.now()}`;
    const other = `zztest-ip-other-${Date.now()}`;
    const now = new Date();
    expect(await isIpBlocked(ip, now)).toBe(false);
    for (let i = 0; i < IP_MAX_FAILURES - 1; i++) await recordFailedAttempt(ip, now);
    expect(await isIpBlocked(ip, now)).toBe(false);
    await recordFailedAttempt(ip, now);
    expect(await isIpBlocked(ip, now)).toBe(true);
    // A different address is not affected.
    expect(await isIpBlocked(other, now)).toBe(false);
    // The block ends when the window passes.
    const later = new Date(now.getTime() + (IP_WINDOW_MINUTES + 1) * 60_000);
    expect(await isIpBlocked(ip, later)).toBe(false);
    await purgeOldAttempts(later);
    expect(await prisma.loginAttempt.count({ where: { ip } })).toBe(0);
  });
});

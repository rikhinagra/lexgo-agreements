import { prisma } from "../db/client";
import { dummyVerify, verifyPassword } from "./password";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; admin: { id: string; name: string; email: string } }
  | { ok: false };

/**
 * Check an email and password. After 5 wrong attempts the account is locked
 * for 15 minutes. The caller always shows the same message for every failure,
 * so the response never reveals whether an email exists or is locked.
 */
export async function verifyLogin(email: string, password: string, now = new Date()): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { email: normalized } });

  if (!admin || !admin.active || !admin.passwordHash) {
    await dummyVerify(password); // spend similar time to a real check
    return { ok: false };
  }

  if (admin.lockedUntil && admin.lockedUntil > now) {
    await dummyVerify(password);
    return { ok: false };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    const failed = admin.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : admin.lockedUntil,
      },
    });
    await prisma.auditLog.create({
      data: { actor: normalized, action: lock ? "login.locked" : "login.failed", entityType: "Admin", entityId: admin.id },
    });
    return { ok: false };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
  });
  await prisma.auditLog.create({
    data: { actor: normalized, action: "login.success", entityType: "Admin", entityId: admin.id },
  });
  return { ok: true, admin: { id: admin.id, name: admin.name, email: admin.email } };
}

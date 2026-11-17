import { prisma } from "../db/client";
import { generateToken, hashToken } from "./token";

export const SESSION_HOURS = 12;

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export async function createSessionRecord(adminId: string, meta: SessionMeta = {}, now = new Date()) {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  await prisma.session.create({
    data: {
      adminId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta.ip?.slice(0, 64) ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

/** Returns the admin for a valid, unexpired session cookie value, otherwise null. */
export async function findValidSession(token: string | undefined, now = new Date()) {
  if (!token || token.length > 200) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  if (!session) return null;
  if (session.expiresAt <= now) return null;
  if (!session.admin.active) return null;
  return { sessionId: session.id, expiresAt: session.expiresAt, admin: session.admin };
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function purgeExpiredSessions(now = new Date()) {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
}

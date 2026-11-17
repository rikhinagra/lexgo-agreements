import { prisma } from "../db/client";

export const IP_WINDOW_MINUTES = 15;
export const IP_MAX_FAILURES = 20;

const bucket = (ip: string | null | undefined) => (ip && ip.length <= 64 ? ip : "unknown");

/** True when this address has failed too many times recently. */
export async function isIpBlocked(ip: string | null | undefined, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - IP_WINDOW_MINUTES * 60_000);
  const count = await prisma.loginAttempt.count({ where: { ip: bucket(ip), createdAt: { gte: since } } });
  return count >= IP_MAX_FAILURES;
}

export async function recordFailedAttempt(ip: string | null | undefined, now = new Date()): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip: bucket(ip), createdAt: now } });
}

/** Old records are not needed once they fall outside the window. */
export async function purgeOldAttempts(now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - IP_WINDOW_MINUTES * 60_000);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

import { prisma } from "../db/client";
import { hashPassword } from "../auth/password";

/** Every row made by tests uses these prefixes, so cleanup can never touch real data. */
export const TEST_COMPANY_PREFIX = "ZZTEST ";
export const TEST_EMAIL_PREFIX = "zztest-";

export async function makeTestAdmin(tag: string, password: string | null = "a strong test password") {
  return prisma.admin.create({
    data: {
      name: `ZZTEST ${tag}`,
      email: `${TEST_EMAIL_PREFIX}${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
      passwordHash: password ? await hashPassword(password) : null,
    },
  });
}

export async function cleanupTestData() {
  const clients = await prisma.client.findMany({
    where: { companyName: { startsWith: TEST_COMPANY_PREFIX } },
    select: { id: true },
  });
  const clientIds = clients.map((c) => c.id);
  const mous = await prisma.mou.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const mouIds = mous.map((m) => m.id);

  await prisma.auditLog.deleteMany({ where: { entityType: "Mou", entityId: { in: mouIds } } });
  await prisma.invoice.deleteMany({ where: { mouId: { in: mouIds } } });
  await prisma.question.deleteMany({ where: { mouId: { in: mouIds } } });
  await prisma.agentChange.deleteMany({ where: { mouId: { in: mouIds } } });
  await prisma.mou.deleteMany({ where: { id: { in: mouIds } } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });

  const admins = await prisma.admin.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id);
  await prisma.auditLog.deleteMany({ where: { entityType: "Admin", entityId: { in: adminIds } } });
  await prisma.admin.deleteMany({ where: { id: { in: adminIds } } }); // sessions cascade
}

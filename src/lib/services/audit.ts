import type { Prisma } from "../../generated/prisma/client";

interface AuditEntry {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Record who did what. Always call inside the same transaction as the change. */
export function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  return tx.auditLog.create({
    data: {
      actor: entry.actor,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      detail: entry.detail,
      ip: entry.ip ?? null,
    },
  });
}

import { prisma } from "../db/client";
import { generateToken, hashToken } from "../auth/token";
import type { MouStatus, Prisma } from "../../generated/prisma/client";
import type { CreateMouInput } from "../validation/mou";
import { describeChanges, type FieldChange } from "../mou-changes";
import { writeAudit } from "./audit";

const DAY_MS = 86_400_000;

/** How long a client link works unless an admin chooses another time. */
export const DEFAULT_LINK_DAYS = 30;

/** Statuses where the client has not signed yet, so the link can still change. */
export const PRE_SIGNING_STATUSES: MouStatus[] = ["DRAFT", "SENT", "VIEWED"];

export function isTestMode(): boolean {
  return process.env.APP_MODE !== "live";
}

/** The link the client opens. Only the hash of the token is stored, so this is shown once. */
export function buildMouLink(token: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/mou/${token}`;
}

/** Statuses where the terms may still be edited. Once signed or cancelled, a MOU is locked. */
export const EDITABLE_STATUSES: MouStatus[] = ["DRAFT", "SENT", "VIEWED", "EXPIRED"];

/** Shows EXPIRED when the link has run out, even though the stored status is unchanged. */
export function displayStatus(
  mou: { status: MouStatus; tokenExpiresAt: Date },
  now = new Date(),
): MouStatus {
  if (PRE_SIGNING_STATUSES.includes(mou.status) && mou.tokenExpiresAt <= now) return "EXPIRED";
  return mou.status;
}

export interface Actor {
  email: string;
  ip?: string | null;
}

export async function createMou(input: CreateMouInput, actor: Actor, now = new Date()) {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + input.linkExpiryDays * DAY_MS);

  const mou = await prisma.$transaction(
    async (tx) => {
      const client = await tx.client.create({ data: { companyName: input.companyName } });
      const created = await tx.mou.create({
        data: {
          clientId: client.id,
          isTest: isTestMode(),
          agents: input.agents,
          rateCents: input.rate,
          billingMode: input.billingMode,
          paymentDueDays: input.paymentDueDays,
          governingLaw: input.governingLaw,
          paymentMethod: input.paymentMethod,
          customScope: input.customScope,
          clientEmail: input.clientEmail,
          ccEmails: input.ccEmails,
          tokenHash: hashToken(token),
          tokenExpiresAt: expiresAt,
        },
      });
      await writeAudit(tx, {
        actor: actor.email,
        action: "mou.created",
        entityType: "Mou",
        entityId: created.id,
        detail: { company: input.companyName, agents: input.agents, rateCents: input.rate, billingMode: input.billingMode, copyEmails: input.ccEmails.length },
        ip: actor.ip,
      });
      return created;
    },
    { maxWait: 15_000, timeout: 20_000 },
  );

  return { mou, token };
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Create a fresh link. The old link stops working at once. */
export async function regenerateLink(
  mouId: string,
  actor: Actor,
  expiryDays = DEFAULT_LINK_DAYS,
  now = new Date(),
): Promise<ServiceResult<{ token: string; expiresAt: Date }>> {
  const days = Math.min(Math.max(Math.trunc(expiryDays), 1), 90);
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + days * DAY_MS);

  return prisma.$transaction(
    async (tx) => {
      const mou = await tx.mou.findUnique({ where: { id: mouId } });
      if (!mou) return { ok: false as const, error: "MOU not found." };
      if (!PRE_SIGNING_STATUSES.includes(mou.status) && mou.status !== "EXPIRED") {
        return { ok: false as const, error: "A new link can only be made before the client signs." };
      }
      await tx.mou.update({
        where: { id: mouId },
        data: {
          tokenHash: hashToken(token),
          tokenExpiresAt: expiresAt,
          tokenRevokedAt: null,
          status: mou.status === "EXPIRED" ? "DRAFT" : mou.status,
        },
      });
      await writeAudit(tx, {
        actor: actor.email, action: "mou.link_regenerated", entityType: "Mou", entityId: mouId,
        detail: { expiryDays: days }, ip: actor.ip,
      });
      return { ok: true as const, value: { token, expiresAt } };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}

/**
 * Change the terms of a MOU that is not signed yet. If it had already been sent, the old
 * link stops working and the status goes back to Draft, so the client can never sign terms
 * that have since changed. The admin sends it again afterwards. Saving with no changes does nothing.
 */
export async function updateMou(
  mouId: string,
  input: CreateMouInput,
  actor: Actor,
  now = new Date(),
): Promise<ServiceResult<{ changes: FieldChange[]; linkStopped: boolean }>> {
  return prisma.$transaction(
    async (tx) => {
      const before = await tx.mou.findUnique({ where: { id: mouId }, include: { client: true } });
      if (!before) return { ok: false as const, error: "MOU not found." };
      if (!EDITABLE_STATUSES.includes(before.status)) {
        return { ok: false as const, error: "A signed or cancelled MOU can no longer be edited." };
      }

      const changes = describeChanges({ ...before, companyName: before.client.companyName }, input);
      if (changes.length === 0) return { ok: true as const, value: { changes, linkStopped: false } };

      const linkStopped = before.status !== "DRAFT";
      const data: Prisma.MouUpdateManyMutationInput = {
        agents: input.agents,
        rateCents: input.rate,
        billingMode: input.billingMode,
        paymentDueDays: input.paymentDueDays,
        governingLaw: input.governingLaw,
        paymentMethod: input.paymentMethod,
        customScope: input.customScope,
        clientEmail: input.clientEmail,
        ccEmails: input.ccEmails,
      };
      if (linkStopped) {
        // A throwaway token replaces the old one, so the old link stops working at once.
        data.tokenHash = hashToken(generateToken());
        data.tokenExpiresAt = new Date(now.getTime() + DEFAULT_LINK_DAYS * DAY_MS);
        data.tokenRevokedAt = null;
        data.status = "DRAFT";
        data.sentAt = null;
        data.viewedAt = null;
      }

      // Only succeeds while the MOU is still in the state we just read, so a client signing at the
      // same moment can never be overwritten.
      const updated = await tx.mou.updateMany({ where: { id: mouId, status: before.status }, data });
      if (updated.count !== 1) {
        return { ok: false as const, error: "This MOU changed while you were editing. Please open it again." };
      }
      if (before.client.companyName !== input.companyName) {
        await tx.client.update({ where: { id: before.clientId }, data: { companyName: input.companyName } });
      }
      await writeAudit(tx, {
        actor: actor.email, action: "mou.edited", entityType: "Mou", entityId: mouId,
        detail: { changes, linkStopped }, ip: actor.ip,
      });
      return { ok: true as const, value: { changes, linkStopped } };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}

/**
 * The admin has checked the MOU and sends it to the client. This always makes a fresh
 * link, because only a scrambled copy of a link is stored and the original cannot be
 * recovered. Any older link stops working. The status becomes Sent.
 */
export async function sendToClient(
  mouId: string,
  actor: Actor,
  now = new Date(),
): Promise<ServiceResult<{ token: string; expiresAt: Date; emails: string[] }>> {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + DEFAULT_LINK_DAYS * DAY_MS);
  return prisma.$transaction(
    async (tx) => {
      const mou = await tx.mou.findUnique({ where: { id: mouId } });
      if (!mou) return { ok: false as const, error: "MOU not found." };
      if (!PRE_SIGNING_STATUSES.includes(mou.status) && mou.status !== "EXPIRED") {
        return { ok: false as const, error: "This MOU can no longer be sent." };
      }
      await tx.mou.update({
        where: { id: mouId },
        data: {
          tokenHash: hashToken(token),
          tokenExpiresAt: expiresAt,
          tokenRevokedAt: null,
          sentAt: now,
          status: mou.status === "DRAFT" || mou.status === "EXPIRED" ? "SENT" : mou.status,
        },
      });
      await writeAudit(tx, {
        actor: actor.email, action: "mou.sent", entityType: "Mou", entityId: mouId,
        detail: { recipients: 1 + mou.ccEmails.length }, ip: actor.ip,
      });
      return { ok: true as const, value: { token, expiresAt, emails: [mou.clientEmail, ...mou.ccEmails] } };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}

/** Cancel a MOU that has not been signed. The link stops working. */
export async function cancelMou(mouId: string, actor: Actor, now = new Date()): Promise<ServiceResult<null>> {
  return prisma.$transaction(
    async (tx) => {
      const mou = await tx.mou.findUnique({ where: { id: mouId } });
      if (!mou) return { ok: false as const, error: "MOU not found." };
      if (!PRE_SIGNING_STATUSES.includes(mou.status) && mou.status !== "EXPIRED") {
        return { ok: false as const, error: "Only an unsigned MOU can be cancelled." };
      }
      await tx.mou.update({
        where: { id: mouId },
        data: { status: "CANCELLED", tokenRevokedAt: now },
      });
      await writeAudit(tx, {
        actor: actor.email, action: "mou.cancelled", entityType: "Mou", entityId: mouId, ip: actor.ip,
      });
      return { ok: true as const, value: null };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}

export interface ListFilter {
  status?: MouStatus;
  search?: string;
  page?: number;
}

export const PAGE_SIZE = 25;

export async function listMous(filter: ListFilter = {}) {
  const page = Math.max(1, Math.trunc(filter.page ?? 1));
  const where: Prisma.MouWhereInput = {};
  if (filter.status) where.status = filter.status;
  const search = filter.search?.trim();
  if (search) {
    where.OR = [
      { client: { companyName: { contains: search, mode: "insensitive" } } },
      { clientEmail: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.mou.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.mou.count({ where }),
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getMouDetail(id: string) {
  const mou = await prisma.mou.findUnique({
    where: { id },
    include: { client: true, questions: { orderBy: { createdAt: "desc" } }, invoices: { orderBy: { issueDate: "desc" } } },
  });
  if (!mou) return null;
  const history = await prisma.auditLog.findMany({
    where: { entityType: "Mou", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { mou, history };
}

/** Counts for the dashboard cards at the top of the MOU list. */
export async function getStatusCounts() {
  const groups = await prisma.mou.groupBy({ by: ["status"], _count: { _all: true } });
  const count = (...statuses: MouStatus[]) =>
    groups.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);
  return {
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
    awaiting: count("DRAFT", "SENT", "VIEWED"),
    signed: count("SIGNED", "ACTIVE"),
  };
}

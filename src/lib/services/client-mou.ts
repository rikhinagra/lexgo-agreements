import { prisma } from "../db/client";
import { hashToken } from "../auth/token";
import { toBusinessDate, dbDateToCalDate } from "../billing";
import { formatDateTime } from "../format";
import { buildMouDocument, hashDocument, TERMS_VERSION, type MouDocument } from "../mou-document";
import type { Prisma } from "../../generated/prisma/client";
import type { QuestionInput, SignMouInput } from "../validation/mou";
import { writeAudit } from "./audit";
import { PRE_SIGNING_STATUSES, type ServiceResult } from "./mou";
import { getSettings } from "./settings";

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export const QUESTION_LIMIT_PER_MOU_PER_HOUR = 3;
export const QUESTION_LIMIT_PER_MOU_TOTAL = 20;
export const QUESTION_LIMIT_PER_IP_PER_HOUR = 10;

type MouWithClient = Prisma.MouGetPayload<{ include: { client: true } }>;

export type ClientLookup =
  | { state: "not_found" }
  | { state: "expired" }
  | { state: "cancelled" }
  | { state: "open"; mou: MouWithClient }
  | { state: "signed"; mou: MouWithClient };

/** Find a MOU from the link the client opened. Only the hash of the link is stored. */
export async function lookupByToken(token: string, now = new Date()): Promise<ClientLookup> {
  if (!TOKEN_SHAPE.test(token)) return { state: "not_found" };
  const mou = await prisma.mou.findUnique({ where: { tokenHash: hashToken(token) }, include: { client: true } });
  if (!mou) return { state: "not_found" };
  if (["SIGNED", "ACTIVE", "TERMINATED"].includes(mou.status)) return { state: "signed", mou };
  if (mou.status === "CANCELLED" || mou.tokenRevokedAt) return { state: "cancelled" };
  if (mou.status === "EXPIRED" || mou.tokenExpiresAt <= now) return { state: "expired" };
  return { state: "open", mou };
}

/** First time the client opens the link, the status becomes Viewed. */
export async function recordView(mou: { id: string; status: string }, ip: string | null, now = new Date()) {
  if (mou.status !== "DRAFT" && mou.status !== "SENT") return;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.mou.updateMany({
      where: { id: mou.id, status: { in: ["DRAFT", "SENT"] } },
      data: { status: "VIEWED", viewedAt: now },
    });
    if (changed.count === 1) {
      await writeAudit(tx, { actor: "client", action: "mou.viewed", entityType: "Mou", entityId: mou.id, ip });
    }
  });
}

/** The MOU text for this agreement. After signing it uses the names saved at signing. */
export async function documentForMou(mou: MouWithClient, now = new Date()): Promise<MouDocument> {
  const settings = await getSettings();
  const signed =
    mou.signedAt && mou.startDate && mou.signerName && mou.signerTitle && mou.signerEmail1
      ? {
          startDate: dbDateToCalDate(mou.startDate),
          signerName: mou.signerName,
          signerTitle: mou.signerTitle,
          signerEmail: mou.signerEmail1,
          signedAtText: formatDateTime(mou.signedAt),
        }
      : null;
  return buildMouDocument({
    companyName: mou.client.companyName,
    agents: mou.agents,
    rateCents: mou.rateCents,
    billingMode: mou.billingMode,
    paymentDueDays: mou.paymentDueDays,
    paymentMethod: mou.paymentMethod,
    governingLaw: mou.governingLaw,
    customScope: mou.customScope,
    providerName: mou.providerLegalName ?? settings.providerLegalName,
    providerSignatoryName: mou.providerSignatoryName ?? settings.providerSignatoryName,
    providerSignatoryTitle: mou.providerSignatoryTitle ?? settings.providerSignatoryTitle,
    signed,
    today: toBusinessDate(now, settings.businessTimezone),
  });
}

export interface ClientMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Save a question from the client. Spam is limited per MOU and per network address. */
export async function askQuestion(
  token: string,
  input: QuestionInput,
  meta: ClientMeta,
  now = new Date(),
): Promise<ServiceResult<null>> {
  const found = await lookupByToken(token, now);
  if (found.state !== "open") return { ok: false, error: "This link is no longer available." };
  const mou = found.mou;
  const hourAgo = new Date(now.getTime() - 3_600_000);

  const [recentForMou, totalForMou, recentForIp] = await Promise.all([
    prisma.question.count({ where: { mouId: mou.id, createdAt: { gte: hourAgo } } }),
    prisma.question.count({ where: { mouId: mou.id } }),
    meta.ip ? prisma.question.count({ where: { ip: meta.ip, createdAt: { gte: hourAgo } } }) : Promise.resolve(0),
  ]);
  if (
    recentForMou >= QUESTION_LIMIT_PER_MOU_PER_HOUR ||
    totalForMou >= QUESTION_LIMIT_PER_MOU_TOTAL ||
    recentForIp >= QUESTION_LIMIT_PER_IP_PER_HOUR
  ) {
    return { ok: false, error: "You have sent several questions already. Please wait a little, or write to hello@lexgosolutions.com." };
  }

  await prisma.$transaction(async (tx) => {
    const q = await tx.question.create({
      data: { mouId: mou.id, body: input.body, replyEmail: input.replyEmail, ip: meta.ip },
    });
    await writeAudit(tx, {
      actor: "client", action: "question.asked", entityType: "Mou", entityId: mou.id,
      detail: { questionId: q.id }, ip: meta.ip,
    });
  });
  return { ok: true, value: null };
}

/**
 * The client signs. The signing time in Pacific becomes the start date. The update only
 * succeeds while the MOU is still unsigned, so two people signing at the same moment can
 * never both succeed.
 */
export async function signMou(
  token: string,
  input: SignMouInput,
  meta: ClientMeta,
  now = new Date(),
): Promise<ServiceResult<{ mouId: string; startDate: string }>> {
  const found = await lookupByToken(token, now);
  if (found.state === "signed") return { ok: false, error: "This MOU has already been signed." };
  if (found.state !== "open") return { ok: false, error: "This link is no longer available." };
  const mou = found.mou;
  if (!PRE_SIGNING_STATUSES.includes(mou.status)) return { ok: false, error: "This link is no longer available." };

  const settings = await getSettings();
  const startDate = toBusinessDate(now, settings.businessTimezone);
  const doc = buildMouDocument({
    companyName: mou.client.companyName,
    agents: mou.agents,
    rateCents: mou.rateCents,
    billingMode: mou.billingMode,
    paymentDueDays: mou.paymentDueDays,
    paymentMethod: mou.paymentMethod,
    governingLaw: mou.governingLaw,
    customScope: mou.customScope,
    providerName: settings.providerLegalName,
    providerSignatoryName: settings.providerSignatoryName,
    providerSignatoryTitle: settings.providerSignatoryTitle,
    signed: {
      startDate,
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      signerEmail: input.signerEmail1,
      signedAtText: formatDateTime(now),
    },
    today: startDate,
  });

  const startDbDate = new Date(Date.UTC(startDate.year, startDate.month - 1, startDate.day));

  return prisma.$transaction(
    async (tx) => {
      const changed = await tx.mou.updateMany({
        where: {
          id: mou.id,
          status: { in: PRE_SIGNING_STATUSES },
          tokenRevokedAt: null,
          tokenExpiresAt: { gt: now },
        },
        data: {
          status: "SIGNED",
          signedAt: now,
          startDate: startDbDate,
          signerName: input.signerName,
          signatureTyped: input.signatureTyped,
          signerTitle: input.signerTitle,
          signerEmail1: input.signerEmail1,
          signerPhone1: input.signerPhone1,
          signerEmail2: input.signerEmail2,
          signerPhone2: input.signerPhone2,
          signerIp: meta.ip,
          signerUserAgent: meta.userAgent?.slice(0, 400) ?? null,
          termsVersion: TERMS_VERSION,
          documentHash: hashDocument(doc),
          providerLegalName: settings.providerLegalName,
          providerSignatoryName: settings.providerSignatoryName,
          providerSignatoryTitle: settings.providerSignatoryTitle,
        },
      });
      if (changed.count !== 1) return { ok: false as const, error: "This MOU can no longer be signed." };
      await writeAudit(tx, {
        actor: "client",
        action: "mou.signed",
        entityType: "Mou",
        entityId: mou.id,
        detail: { signer: input.signerName, email: input.signerEmail1, termsVersion: TERMS_VERSION },
        ip: meta.ip,
      });
      return {
        ok: true as const,
        value: { mouId: mou.id, startDate: `${startDate.year}-${String(startDate.month).padStart(2, "0")}-${String(startDate.day).padStart(2, "0")}` },
      };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/billing";
import { actionLabel, formatDate, formatDateTime, formatDay, initials } from "@/lib/format";
import { displayStatus, getMouDetail, PRE_SIGNING_STATUSES } from "@/lib/services/mou";
import { FlashMessage } from "./flash-message";
import { LinkPanel } from "./link-panel";

export const metadata: Metadata = { title: "MOU details" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-t border-navy/5 py-3 text-sm first:border-t-0 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-slate">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-navy">{children}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card min-w-0">
      <h2 className="mb-5 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

const EDIT_MESSAGES: Record<string, { text: string; tone: "ok" | "warn" }> = {
  saved: { text: "Changes saved.", tone: "ok" },
  stopped: { text: "Changes saved. The old client link no longer works, so please send the MOU to the client again.", tone: "warn" },
  none: { text: "No changes were made.", tone: "ok" },
};

export default async function MouDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edited?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { edited } = await searchParams;
  const banner = edited ? EDIT_MESSAGES[edited] : undefined;
  const detail = await getMouDetail(id);
  if (!detail) notFound();
  const { mou, history } = detail;
  const status = displayStatus(mou);
  const canChange = PRE_SIGNING_STATUSES.includes(mou.status) || mou.status === "EXPIRED";

  return (
    <div className="fade-up space-y-7">
      <div>
        <Link href="/admin/mous" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate hover:text-navy">
          <Icon name="arrowLeft" className="h-4 w-4" /> Back to MOUs
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-lg font-bold text-white">
              {initials(mou.client.companyName)}
            </span>
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-bold leading-tight sm:text-3xl">{mou.client.companyName}</h1>
              <p className="text-sm text-slate">Created {formatDate(mou.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canChange ? (
              <Link href={`/admin/mous/${mou.id}/edit`} className="btn-outline">
                <Icon name="edit" className="h-4 w-4" /> Edit
              </Link>
            ) : null}
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {banner ? <FlashMessage key={edited} text={banner.text} tone={banner.tone} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Agreement terms">
          <dl>
            <Row label="VA agents">{mou.agents}</Row>
            <Row label="Rate per agent">{formatCents(mou.rateCents)} per month</Row>
            <Row label="Monthly total">{formatCents(mou.rateCents * mou.agents)}</Row>
            <Row label="Billing">{mou.billingMode === "ADVANCE" ? "In advance" : "In arrears"}</Row>
            <Row label="Payment due">{mou.paymentDueDays === 0 ? "Upon receipt" : `Within ${mou.paymentDueDays} days`}</Row>
            <Row label="Governing law">{mou.governingLaw ?? "Not set"}</Row>
            <Row label="Payment method">{mou.paymentMethod ?? "Not set"}</Row>
            <Row label="Extra scope">{mou.customScope ?? "None"}</Row>
            <Row label="Client email">{mou.clientEmail}</Row>
            <Row label="Copies to">{mou.ccEmails.length > 0 ? mou.ccEmails.join(", ") : "No one else"}</Row>
          </dl>
        </Card>

        {mou.signedAt ? (
          <Card title="Signing record">
            <dl>
              <Row label="Signed by">{mou.signerName}, {mou.signerTitle}</Row>
              <Row label="Signed on">{formatDateTime(mou.signedAt)}</Row>
              <Row label="Start date">{mou.startDate ? formatDay(mou.startDate) : "Not set"}</Row>
              <Row label="Email">{mou.signerEmail1}{mou.signerEmail2 ? `, ${mou.signerEmail2}` : ""}</Row>
              <Row label="Phone">{mou.signerPhone1}{mou.signerPhone2 ? `, ${mou.signerPhone2}` : ""}</Row>
              <Row label="Network address">{mou.signerIp ?? "Not recorded"}</Row>
              <Row label="MOU version">{mou.termsVersion}</Row>
              <Row label="Document fingerprint"><span className="font-mono text-xs">{mou.documentHash?.slice(0, 24)}</span></Row>
            </dl>
          </Card>
        ) : (
          <Card title="Send to the client">
            <p className="mb-5 text-sm text-slate">
              {mou.sentAt ? <>Last sent {formatDate(mou.sentAt)}. </> : null}
              The link works until <strong className="text-navy">{formatDate(mou.tokenExpiresAt)}</strong>. For safety the link itself is never stored, so it can only be shown when it is made.
            </p>
            <LinkPanel mouId={mou.id} canChange={canChange} alreadySent={mou.sentAt !== null} recipients={[mou.clientEmail, ...mou.ccEmails]} company={mou.client.companyName} />
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Invoices">
          {mou.invoices.length === 0 ? (
            <p className="text-sm text-slate">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-navy/5 text-sm">
              {mou.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3 first:pt-0">
                  <span className="font-medium">{i.number}</span>
                  <span className="tabular-nums">{formatCents(i.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Questions from the client">
          {mou.questions.length === 0 ? (
            <p className="text-sm text-slate">No questions so far.</p>
          ) : (
            <ul className="space-y-4 text-sm">
              {mou.questions.map((q) => (
                <li key={q.id} className="rounded-xl bg-cream p-4">
                  <p className="break-words">{q.body}</p>
                  <p className="mt-2 break-all text-xs text-slate">Reply to {q.replyEmail}</p>
                  <p className="text-xs text-slate">{formatDateTime(q.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="History">
        <ol className="relative space-y-5 border-l border-navy/15 pl-6">
          {history.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-gold ring-1 ring-navy/20" />
              <p className="text-sm font-semibold">{actionLabel(h.action)}</p>
              <p className="break-all text-xs text-slate">by {h.actor}</p>
              <p className="text-xs text-slate">{formatDateTime(h.createdAt)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

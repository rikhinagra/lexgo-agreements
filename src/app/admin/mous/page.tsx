import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { SelectField } from "@/components/SelectField";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/billing";
import { formatDate, initials } from "@/lib/format";
import { displayStatus, getStatusCounts, listMous } from "@/lib/services/mou";
import type { MouStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "MOUs" };

const STATUSES: MouStatus[] = ["DRAFT", "SENT", "VIEWED", "SIGNED", "ACTIVE", "EXPIRED", "CANCELLED", "TERMINATED"];

type SearchParams = Promise<{ status?: string; q?: string; page?: string }>;

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-[#8a6d00]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <p className="font-display text-3xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-sm text-slate">{label}</p>
      </div>
    </div>
  );
}

export default async function MouListPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as MouStatus) ? (sp.status as MouStatus) : undefined;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Number(sp.page) || 1;
  const [{ rows, total, pageCount, page: current }, counts] = await Promise.all([
    listMous({ status, search: q, page }),
    getStatusCounts(),
  ]);
  const filtered = Boolean(status || q);

  const href = (p: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q: q || undefined, ...p })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/admin/mous?${s}` : "/admin/mous";
  };

  return (
    <div className="fade-up space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">MOUs</h1>
          <p className="mt-1 text-slate">Every agreement you have sent, signed or cancelled.</p>
        </div>
        <Link href="/admin/mous/new" className="btn-gold"><Icon name="plus" className="h-4 w-4" /> New MOU</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="document" label="Total MOUs" value={counts.total} />
        <StatCard icon="clock" label="Awaiting signature" value={counts.awaiting} />
        <StatCard icon="checkCircle" label="Signed or active" value={counts.signed} />
      </div>

      <form className="card flex flex-wrap items-center gap-3 p-4" action="/admin/mous">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate" />
          <input className="input pl-11" name="q" defaultValue={q} placeholder="Search by company or email" />
        </div>
        <SelectField wrapperClassName="w-full sm:w-auto sm:min-w-[11rem]" name="status" defaultValue={status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </SelectField>
        <button className="btn">Apply</button>
        {filtered ? <Link href="/admin/mous" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate underline-offset-4 hover:text-navy hover:underline">Clear</Link> : null}
      </form>

      <div className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 text-[#8a6d00]">
              <Icon name="document" className="h-8 w-8" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold">{filtered ? "No matching MOUs" : "No MOUs yet"}</h2>
            <p className="mt-2 max-w-sm text-slate">
              {filtered ? "Try a different search or clear the filters." : "Create your first MOU and send the secure link to your client."}
            </p>
            {!filtered ? <Link href="/admin/mous/new" className="btn-gold mt-6"><Icon name="plus" className="h-4 w-4" /> Create a MOU</Link> : null}
          </div>
        ) : (
          <>
            {/* Phones and tablets: one card per MOU, so nothing is cut off or needs sideways scrolling */}
            <ul className="divide-y divide-navy/5 lg:hidden">
              {rows.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/mous/${m.id}`} className="block px-5 py-4 transition hover:bg-cream/60 active:bg-cream">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                          {initials(m.client.companyName)}
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-2 break-words font-semibold text-navy">{m.client.companyName}</p>
                          <p className="truncate text-xs text-slate">{m.clientEmail}</p>
                        </div>
                      </div>
                      <div className="shrink-0"><StatusBadge status={displayStatus(m)} /></div>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div><dt className="text-slate">Agents</dt><dd className="mt-0.5 font-semibold tabular-nums">{m.agents}</dd></div>
                      <div><dt className="text-slate">Rate</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatCents(m.rateCents)}</dd></div>
                      <div><dt className="text-slate">Billing</dt><dd className="mt-0.5 font-semibold">{m.billingMode === "ADVANCE" ? "In advance" : "In arrears"}</dd></div>
                    </dl>
                    <p className="mt-2 text-xs text-slate">Created {formatDate(m.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Laptops and desktops: full table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 bg-cream/70 text-xs font-semibold uppercase tracking-wider text-slate">
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-4 py-3.5 text-right">Agents</th>
                  <th className="px-4 py-3.5 text-right">Rate</th>
                  <th className="px-4 py-3.5">Billing</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {rows.map((m) => (
                  <tr key={m.id} className="group transition hover:bg-cream/60">
                    <td className="px-6 py-4">
                      <Link href={`/admin/mous/${m.id}`} className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                          {initials(m.client.companyName)}
                        </span>
                        <span>
                          <span className="block font-semibold text-navy group-hover:underline">{m.client.companyName}</span>
                          <span className="block text-xs text-slate">{m.clientEmail}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">{m.agents}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{formatCents(m.rateCents)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{m.billingMode === "ADVANCE" ? "In advance" : "In arrears"}</td>
                    <td className="px-4 py-4"><StatusBadge status={displayStatus(m)} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="flex items-center justify-between text-sm text-slate">
          <span>{total} {total === 1 ? "MOU" : "MOUs"}</span>
          <div className="flex items-center gap-4">
            {current > 1 ? <Link className="inline-flex min-h-11 items-center gap-1 font-medium text-navy hover:underline" href={href({ page: String(current - 1) })}><Icon name="arrowLeft" className="h-4 w-4" /> Previous</Link> : null}
            <span>Page {current} of {pageCount}</span>
            {current < pageCount ? <Link className="inline-flex min-h-11 items-center gap-1 font-medium text-navy hover:underline" href={href({ page: String(current + 1) })}>Next <Icon name="arrowRight" className="h-4 w-4" /></Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

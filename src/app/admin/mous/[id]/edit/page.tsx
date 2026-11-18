import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth/session";
import { EDITABLE_STATUSES, getMouDetail } from "@/lib/services/mou";
import { getSettings } from "@/lib/services/settings";
import { CreateMouForm } from "../../new/create-form";

export const metadata: Metadata = { title: "Edit MOU" };

const POINTS = [
  "Change only what is wrong, then save.",
  "If the MOU was not sent yet, the changes simply save.",
  "If it was already sent, the old link stops working and you send it again.",
  "Once the client has signed, a MOU is locked.",
];

const dollars = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));

export default async function EditMouPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getMouDetail(id);
  if (!detail) notFound();
  const { mou } = detail;
  if (!EDITABLE_STATUSES.includes(mou.status)) redirect(`/admin/mous/${id}`);

  const s = await getSettings();
  return (
    <div className="fade-up">
      <Link href={`/admin/mous/${id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate hover:text-navy">
        <Icon name="arrowLeft" className="h-4 w-4" /> Back to MOU
      </Link>
      <h1 className="mb-1 mt-3 font-display text-4xl font-bold">Edit MOU</h1>
      <p className="mb-8 break-words text-slate">{mou.client.companyName}</p>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
        <CreateMouForm
          defaults={{
            rate: dollars(s.defaultRateCents),
            paymentDueDays: String(s.defaultPaymentDueDays),
            billingMode: s.defaultBillingMode,
            governingLaw: s.defaultGoverningLaw,
            paymentMethod: s.defaultPaymentMethod,
          }}
          edit={{
            mouId: mou.id,
            wasSent: mou.status !== "DRAFT",
            cc: mou.ccEmails,
            values: {
              companyName: mou.client.companyName,
              clientEmail: mou.clientEmail,
              agents: String(mou.agents),
              rate: dollars(mou.rateCents),
              customScope: mou.customScope ?? "",
              billingMode: mou.billingMode,
              paymentDueDays: String(mou.paymentDueDays),
              governingLaw: mou.governingLaw ?? "",
              paymentMethod: mou.paymentMethod ?? "",
            },
          }}
        />
        <aside className="card bg-navy text-white lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold text-white">Before you save</h2>
          <ol className="mt-5 space-y-4">
            {POINTS.map((t, i) => (
              <li key={t} className="flex gap-3 text-sm text-white/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

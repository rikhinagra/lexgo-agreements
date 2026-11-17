import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { CreateMouForm } from "./create-form";

export const metadata: Metadata = { title: "New MOU" };

const STEPS = [
  "You enter the terms agreed on the call.",
  "The client receives a secure link to review the MOU.",
  "The client signs online, and the start date is locked in.",
  "The first invoice is created and monthly invoices follow.",
];

export default async function NewMouPage() {
  await requireAdmin();
  const s = await getSettings();
  const dollars = (s.defaultRateCents / 100).toFixed(2).replace(/\.00$/, "");
  return (
    <div className="fade-up">
      <Link href="/admin/mous" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate hover:text-navy">
        <Icon name="arrowLeft" className="h-4 w-4" /> Back to MOUs
      </Link>
      <h1 className="mb-1 mt-3 font-display text-4xl font-bold">New MOU</h1>
      <p className="mb-8 text-slate">Create a prefilled agreement and get a secure link for your client.</p>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
        <CreateMouForm
          defaults={{
            rate: dollars,
            paymentDueDays: String(s.defaultPaymentDueDays),
            billingMode: s.defaultBillingMode,
            governingLaw: s.defaultGoverningLaw,
            paymentMethod: s.defaultPaymentMethod,
          }}
        />
        <aside className="card bg-navy text-white lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold text-white">How it works</h2>
          <ol className="mt-5 space-y-4">
            {STEPS.map((t, i) => (
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

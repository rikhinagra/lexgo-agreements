"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { LinkBox } from "@/components/LinkBox";
import { SelectField } from "@/components/SelectField";
import { createMouAction, type CreateMouState } from "./actions";

export interface FormDefaults {
  rate: string;
  paymentDueDays: string;
  billingMode: "ADVANCE" | "ARREARS";
  governingLaw: string;
  paymentMethod: string;
}

type FieldName = keyof FormDefaults | "companyName" | "agents" | "clientEmail" | "customScope" | "linkExpiryDays";

// Changing the key throws away the old form state, which gives a clean form.
export function CreateMouForm({ defaults }: { defaults: FormDefaults }) {
  const [round, setRound] = useState(0);
  return <CreateMouFormInner key={round} defaults={defaults} onCreateAnother={() => setRound((n) => n + 1)} />;
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-5">
        <span className="block font-display text-xl font-bold">{title}</span>
        <span className="block text-sm text-slate">{text}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function CreateMouFormInner({ defaults, onCreateAnother }: { defaults: FormDefaults; onCreateAnother: () => void }) {
  const [state, formAction, pending] = useActionState<CreateMouState, FormData>(createMouAction, {});

  if (state.created) {
    return (
      <div className="card fade-up space-y-5 p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon name="checkCircle" className="h-8 w-8" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">MOU created for {state.created.company}</h2>
          <p className="mt-2 text-slate">
            Copy the secure client link below. It is shown only once, because only a scrambled copy is stored.
            It expires on <strong className="text-navy">{state.created.expiresAt}</strong>.
          </p>
        </div>
        <LinkBox link={state.created.link} />
        <div className="flex flex-wrap gap-3 pt-1">
          <Link className="btn" href={`/admin/mous/${state.created.id}`}>View MOU <Icon name="arrowRight" className="h-4 w-4" /></Link>
          <button type="button" className="btn-outline" onClick={onCreateAnother}>Create another</button>
        </div>
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const val = (name: FieldName, fallback = "") => v[name] ?? fallback;
  const fieldError = (name: string) => (err[name]?.[0] ? <p className="field-error">{err[name]![0]}</p> : null);

  return (
    <form action={formAction} className="card space-y-9 p-7 sm:p-8">
      <Section title="Client" text="Who is this agreement with?">
        <div>
          <label className="label" htmlFor="companyName">Company name</label>
          <input className="input" id="companyName" name="companyName" defaultValue={val("companyName")} placeholder="For example, Spectrum MRI" required />
          {fieldError("companyName")}
        </div>
        <div>
          <label className="label" htmlFor="clientEmail">Client email</label>
          <input className="input" id="clientEmail" name="clientEmail" type="email" defaultValue={val("clientEmail")} placeholder="name@company.com" required />
          <p className="hint">The secure MOU link is sent to this address.</p>
          {fieldError("clientEmail")}
        </div>
      </Section>

      <Section title="Services and pricing" text="What the client is buying.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="agents">Number of VA agents</label>
            <input className="input" id="agents" name="agents" type="number" min={1} max={500} defaultValue={val("agents", "2")} required />
            {fieldError("agents")}
          </div>
          <div>
            <label className="label" htmlFor="rate">Monthly rate per agent (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate">$</span>
              <input className="input pl-8" id="rate" name="rate" inputMode="decimal" defaultValue={val("rate", defaults.rate)} required />
            </div>
            {fieldError("rate")}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="customScope">Extra scope line <span className="font-normal text-slate">(optional)</span></label>
          <input className="input" id="customScope" name="customScope" defaultValue={val("customScope")} placeholder="Any special task for this client" />
          {fieldError("customScope")}
        </div>
      </Section>

      <Section title="Billing and legal" text="Copied into this MOU, so later default changes never alter it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="billingMode">Billing timing</label>
            <SelectField id="billingMode" name="billingMode" defaultValue={val("billingMode", defaults.billingMode)}>
              <option value="ADVANCE">In advance (first invoice at signing)</option>
              <option value="ARREARS">In arrears (invoice after the month)</option>
            </SelectField>
            {fieldError("billingMode")}
          </div>
          <div>
            <label className="label" htmlFor="paymentDueDays">Payment due within (days)</label>
            <input className="input" id="paymentDueDays" name="paymentDueDays" type="number" min={0} max={90} defaultValue={val("paymentDueDays", defaults.paymentDueDays)} required />
            {fieldError("paymentDueDays")}
          </div>
          <div>
            <label className="label" htmlFor="governingLaw">Governing law</label>
            <input className="input" id="governingLaw" name="governingLaw" defaultValue={val("governingLaw", defaults.governingLaw)} required />
            {fieldError("governingLaw")}
          </div>
          <div>
            <label className="label" htmlFor="paymentMethod">Payment method</label>
            <input className="input" id="paymentMethod" name="paymentMethod" defaultValue={val("paymentMethod", defaults.paymentMethod)} required />
            {fieldError("paymentMethod")}
          </div>
        </div>
        <div className="max-w-[14rem]">
          <label className="label" htmlFor="linkExpiryDays">Link valid for (days)</label>
          <input className="input" id="linkExpiryDays" name="linkExpiryDays" type="number" min={1} max={90} defaultValue={val("linkExpiryDays", "14")} />
          {fieldError("linkExpiryDays")}
        </div>
      </Section>

      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p> : null}
      <div className="flex items-center gap-3 border-t border-navy/10 pt-6">
        <button className="btn-gold px-6 py-3" disabled={pending}>
          {pending ? (<><Spinner /> Creating</>) : (<>Create MOU <Icon name="arrowRight" className="h-4 w-4" /></>)}
        </button>
        <Link href="/admin/mous" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate hover:text-navy">Cancel</Link>
      </div>
    </form>
  );
}

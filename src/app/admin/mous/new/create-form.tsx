"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { SelectField } from "@/components/SelectField";
import { updateMouAction } from "../[id]/edit/actions";
import { createMouAction, type CreateMouState } from "./actions";

export interface FormDefaults {
  rate: string;
  paymentDueDays: string;
  billingMode: "ADVANCE" | "ARREARS";
  governingLaw: string;
  paymentMethod: string;
}

type FieldName = keyof FormDefaults | "companyName" | "agents" | "clientEmail" | "customScope";

/** Set when an existing, unsigned MOU is being edited instead of a new one being created. */
export interface EditSetup {
  mouId: string;
  values: Record<string, string>;
  cc: string[];
  /** True when the client link has already been made, so saving a change stops the old link. */
  wasSent: boolean;
}

// Changing the key throws away the old form state, which gives a clean form.
export function CreateMouForm({ defaults, edit }: { defaults: FormDefaults; edit?: EditSetup }) {
  const [round, setRound] = useState(0);
  return <CreateMouFormInner key={round} defaults={defaults} edit={edit} onCreateAnother={() => setRound((n) => n + 1)} />;
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

function CreateMouFormInner({ defaults, edit, onCreateAnother }: { defaults: FormDefaults; edit?: EditSetup; onCreateAnother: () => void }) {
  const [state, formAction, pending] = useActionState<CreateMouState, FormData>(
    edit ? updateMouAction.bind(null, edit.mouId) : createMouAction,
    {},
  );
  const [copies, setCopies] = useState<string[]>(edit?.cc ?? []);
  const [shownErrorFor, setShownErrorFor] = useState<CreateMouState | null>(null);
  // After a failed save the server sends the copy emails back, so nothing typed is lost.
  if (state.ccEmails && shownErrorFor !== state) {
    setShownErrorFor(state);
    setCopies(state.ccEmails);
  }

  if (state.created) {
    return (
      <div className="card fade-up space-y-5 p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon name="checkCircle" className="h-8 w-8" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">MOU saved for {state.created.company}</h2>
          <p className="mt-2 text-slate">
            Nothing has been sent yet. Check the details, then send it to the client from the next screen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link className="btn" href={`/admin/mous/${state.created.id}`}>Review and send <Icon name="arrowRight" className="h-4 w-4" /></Link>
          <button type="button" className="btn-outline" onClick={onCreateAnother}>Create another</button>
        </div>
      </div>
    );
  }

  const v = state.values ?? edit?.values ?? {};
  const err = state.fieldErrors ?? {};
  const val = (name: FieldName, fallback = "") => v[name] ?? fallback;
  const fieldError = (name: string) => (err[name]?.[0] ? <p className="field-error">{err[name]![0]}</p> : null);

  return (
    <form action={formAction} className="card space-y-9 p-7 sm:p-8">
      {edit?.wasSent ? (
        <div className="flex items-start gap-3 rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm text-navy">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6d00]" />
          <p>
            This MOU was already sent. <strong>If you change anything, the old link stops working</strong> and you will need to send it to the client again.
          </p>
        </div>
      ) : null}
      <Section title="Client" text="Who is this agreement with?">
        <div>
          <label className="label" htmlFor="companyName">Company name</label>
          <input className="input" id="companyName" name="companyName" defaultValue={val("companyName")} placeholder="For example, Spectrum MRI" required />
          {fieldError("companyName")}
        </div>
        <div>
          <label className="label" htmlFor="clientEmail">Client email</label>
          <input className="input" id="clientEmail" name="clientEmail" type="email" defaultValue={val("clientEmail")} placeholder="name@company.com" required />
          <p className="hint">The main contact. This person receives the MOU and signs it.</p>
          {fieldError("clientEmail")}
        </div>
        <div>
          <span className="label">Send a copy to others <span className="font-normal text-slate">(optional)</span></span>
          {copies.length > 0 ? (
            <ul className="space-y-2">
              {copies.map((email, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    className="input"
                    name="ccEmail"
                    type="email"
                    aria-label={`Copy email ${index + 1}`}
                    value={email}
                    placeholder="name@company.com"
                    onChange={(e) => setCopies((list) => list.map((item, i) => (i === index ? e.target.value : item)))}
                  />
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-navy/15 text-slate transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove copy email ${index + 1}`}
                    onClick={() => setCopies((list) => list.filter((_, i) => i !== index))}
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {copies.length < 5 ? (
            <button type="button" className="btn-outline mt-3" onClick={() => setCopies((list) => [...list, ""])}>
              <Icon name="plus" className="h-4 w-4" /> Add another email
            </button>
          ) : null}
          <p className="hint">These people get a copy only. Only one person signs, whoever opens the link and signs.</p>
          {fieldError("ccEmails")}
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
      </Section>

      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p> : null}
      <div className="flex items-center gap-3 border-t border-navy/10 pt-6">
        <button className="btn-gold px-6 py-3" disabled={pending}>
          {pending ? (<><Spinner /> {edit ? "Saving" : "Creating"}</>) : edit ? (<>Save changes <Icon name="check" className="h-4 w-4" /></>) : (<>Create MOU <Icon name="arrowRight" className="h-4 w-4" /></>)}
        </button>
        <Link href={edit ? `/admin/mous/${edit.mouId}` : "/admin/mous"} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate hover:text-navy">Cancel</Link>
      </div>
    </form>
  );
}

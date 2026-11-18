"use client";

import { useActionState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { signMouAction, type ClientFormState } from "./actions";

export function SignForm({ token, company }: { token: string; company: string }) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(signMouAction.bind(null, token), {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const fieldError = (name: string) => (err[name]?.[0] ? <p className="field-error">{err[name]![0]}</p> : null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="signerName">Full name</label>
        <input className="input" id="signerName" name="signerName" autoComplete="name" defaultValue={v.signerName ?? ""} required />
        {fieldError("signerName")}
      </div>
      <div>
        <label className="label" htmlFor="signerTitle">Job title</label>
        <input className="input" id="signerTitle" name="signerTitle" autoComplete="organization-title" defaultValue={v.signerTitle ?? ""} required />
        {fieldError("signerTitle")}
      </div>
      <div>
        <label className="label" htmlFor="signerEmail1">Email</label>
        <input className="input" id="signerEmail1" name="signerEmail1" type="email" autoComplete="email" defaultValue={v.signerEmail1 ?? ""} required />
        {fieldError("signerEmail1")}
      </div>
      <div>
        <label className="label" htmlFor="signerPhone1">Phone</label>
        <input className="input" id="signerPhone1" name="signerPhone1" type="tel" autoComplete="tel" defaultValue={v.signerPhone1 ?? ""} required />
        {fieldError("signerPhone1")}
      </div>
      <div>
        <label className="label" htmlFor="signerEmail2">Second email <span className="font-normal text-slate">(optional)</span></label>
        <input className="input" id="signerEmail2" name="signerEmail2" type="email" defaultValue={v.signerEmail2 ?? ""} />
        {fieldError("signerEmail2")}
      </div>
      <div>
        <label className="label" htmlFor="signerPhone2">Second phone <span className="font-normal text-slate">(optional)</span></label>
        <input className="input" id="signerPhone2" name="signerPhone2" type="tel" defaultValue={v.signerPhone2 ?? ""} />
        {fieldError("signerPhone2")}
      </div>

      <div className="border-t border-navy/10 pt-5">
        <label className="label" htmlFor="signatureTyped">Type your full name as your signature</label>
        <input className="input font-display text-xl italic" id="signatureTyped" name="signatureTyped" autoComplete="off" defaultValue={v.signatureTyped ?? ""} required />
        {fieldError("signatureTyped")}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input className="mt-1 h-5 w-5 shrink-0 accent-navy" type="checkbox" name="agree" defaultChecked={v.agree === "on"} />
          <span>I have read this MOU and I agree to it. I am authorised to sign for <strong>{company}</strong>.</span>
        </label>
        {fieldError("agree")}
      </div>

      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p> : null}

      <button className="btn-gold w-full px-6 py-3" disabled={pending}>
        {pending ? (<><Spinner /> Signing</>) : (<><Icon name="pen" className="h-4 w-4" /> Sign this MOU</>)}
      </button>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-slate">
        <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your signing time, network address and device are recorded as proof of signing.
      </p>
    </form>
  );
}

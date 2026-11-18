"use client";

import { useActionState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { askQuestionAction, type ClientFormState } from "./actions";

export function QuestionForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(askQuestionAction.bind(null, token), {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  if (state.sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Thank you. Your question has been sent to the LexGo team. They will reply to the email address you gave. You can keep this page open and sign when you are ready.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="q-body">Your question</label>
        <textarea className="input min-h-28 resize-y" id="q-body" name="body" maxLength={2000} defaultValue={v.body ?? ""} required />
        {err.body?.[0] ? <p className="field-error">{err.body[0]}</p> : null}
      </div>
      <div>
        <label className="label" htmlFor="q-email">Where should we reply?</label>
        <input className="input" id="q-email" name="replyEmail" type="email" autoComplete="email" defaultValue={v.replyEmail ?? ""} placeholder="name@company.com" required />
        {err.replyEmail?.[0] ? <p className="field-error">{err.replyEmail[0]}</p> : null}
      </div>
      {/* Hidden from people, bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="q-website">Leave this empty</label>
        <input id="q-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p> : null}
      <button className="btn-outline w-full sm:w-auto" disabled={pending}>
        {pending ? (<><Spinner /> Sending</>) : (<><Icon name="send" className="h-4 w-4" /> Send question</>)}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LinkBox } from "@/components/LinkBox";
import { cancelMouAction, sendToClientAction, type LinkState } from "./actions";

export function LinkPanel({
  mouId,
  canChange,
  alreadySent,
  recipients,
  company,
}: {
  mouId: string;
  canChange: boolean;
  alreadySent: boolean;
  recipients: string[];
  company: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [send, sendAction, sendPending] = useActionState<LinkState, FormData>(sendToClientAction.bind(null, mouId), {});
  const [cancel, cancelAction, cancelPending] = useActionState<LinkState, FormData>(
    cancelMouAction.bind(null, mouId) as (s: LinkState, f: FormData) => Promise<LinkState>,
    {},
  );

  if (!canChange) {
    return <p className="text-sm text-slate">This MOU can no longer be sent or changed.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate">
          Check the terms first. When everything is correct, send it. {recipients.length > 1 ? "Everyone listed below is included." : ""}
        </p>
        <ul className="space-y-1 text-sm">
          {recipients.map((email, index) => (
            <li key={email} className="flex items-start gap-2 break-all">
              <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-slate" />
              <span>{email} <span className="text-slate">{index === 0 ? "(signs)" : "(copy)"}</span></span>
            </li>
          ))}
        </ul>
        <form action={sendAction}>
          <button className="btn-gold" disabled={sendPending}>
            {sendPending ? (<><Spinner /> Working</>) : (<><Icon name="send" className="h-4 w-4" /> {alreadySent ? "Send again with a new link" : "Send to client"}</>)}
          </button>
        </form>
        {alreadySent ? <p className="hint">A new link replaces the old one at once. The old link stops working.</p> : null}
      </div>
      {send.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{send.error}</p> : null}
      {send.link ? (
        <div className="space-y-2">
          <p className="text-sm text-slate">The secure link is ready, valid until <strong className="text-navy">{send.expiresAt}</strong>. Copy it and share it with the client. It is shown only once.</p>
          <LinkBox link={send.link} />
        </div>
      ) : null}

      <div className="border-t border-navy/10 pt-5">
        <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)}>
          Cancel this MOU
        </button>
        {cancel.error ? <p role="alert" className="field-error">{cancel.error}</p> : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this MOU?"
        description={
          <>
            <p>
              The client link for <strong className="text-navy">{company}</strong> will stop working at once, and the client will no longer be able to read or sign it.
            </p>
            <p className="mt-2">This cannot be undone. You can create a new MOU later if you need one.</p>
          </>
        }
      >
        <button type="button" className="btn-outline" onClick={() => setConfirmOpen(false)} disabled={cancelPending}>
          Keep MOU
        </button>
        <form action={cancelAction} className="contents">
          <button className="btn bg-red-600 hover:bg-red-700" disabled={cancelPending}>
            {cancelPending ? (<><Spinner /> Cancelling</>) : "Yes, cancel MOU"}
          </button>
        </form>
      </ConfirmDialog>
    </div>
  );
}

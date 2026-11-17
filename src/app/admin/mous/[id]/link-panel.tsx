"use client";

import { useActionState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { LinkBox } from "@/components/LinkBox";
import { cancelMouAction, regenerateLinkAction, type LinkState } from "./actions";

export function LinkPanel({ mouId, canChange }: { mouId: string; canChange: boolean }) {
  const [regen, regenAction, regenPending] = useActionState<LinkState, FormData>(regenerateLinkAction.bind(null, mouId), {});
  const [cancel, cancelAction, cancelPending] = useActionState<LinkState, FormData>(
    cancelMouAction.bind(null, mouId) as (s: LinkState, f: FormData) => Promise<LinkState>,
    {},
  );

  if (!canChange) {
    return <p className="text-sm text-slate">This MOU can no longer change its link.</p>;
  }

  return (
    <div className="space-y-6">
      <form action={regenAction} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className="label" htmlFor="days">Valid for (days)</label>
            <input className="input" id="days" name="days" type="number" min={1} max={90} defaultValue={14} />
          </div>
          <button className="btn-outline" disabled={regenPending}>
            {regenPending ? (<><Spinner /> Working</>) : (<><Icon name="link" className="h-4 w-4" /> Make a new link</>)}
          </button>
        </div>
        <p className="hint">A new link replaces the old one at once. The old link stops working.</p>
      </form>
      {regen.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{regen.error}</p> : null}
      {regen.link ? (
        <div className="space-y-2">
          <p className="text-sm text-slate">New link, shown only once. Valid until <strong className="text-navy">{regen.expiresAt}</strong>.</p>
          <LinkBox link={regen.link} />
        </div>
      ) : null}

      <div className="border-t border-navy/10 pt-5">
        <form
          action={cancelAction}
          onSubmit={(e) => {
            if (!window.confirm("Cancel this MOU? The client link will stop working.")) e.preventDefault();
          }}
        >
          <button className="btn-danger" disabled={cancelPending}>
            {cancelPending ? (<><Spinner /> Cancelling</>) : "Cancel this MOU"}
          </button>
        </form>
        {cancel.error ? <p role="alert" className="field-error">{cancel.error}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";

/**
 * A proper pop-up for confirming something that cannot be undone. It uses the browser's
 * built in dialog, so the page behind is locked, Escape closes it, and keyboard focus stays inside.
 * The action buttons are passed in as children so each screen decides what they do.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dark area outside the card closes the pop-up.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-navy shadow-2xl backdrop:bg-navy/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Icon name="alert" className="h-6 w-6" />
        </span>
        <h2 id="confirm-title" className="mt-5 font-display text-xl font-bold">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate">{description}</div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
      </div>
    </dialog>
  );
}

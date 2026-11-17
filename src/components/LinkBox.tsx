"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center">
      <Icon name="link" className="hidden h-5 w-5 shrink-0 text-[#8a6d00] sm:block" />
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-navy">{link}</code>
      <button
        type="button"
        className="btn shrink-0 px-4 py-2"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

/**
 * A short message after an action. It fades away by itself, and the address is cleaned up
 * so refreshing the page does not show it again. Warnings stay longer because they ask for an action.
 */
export function FlashMessage({ text, tone }: { text: string; tone: "ok" | "warn" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const seconds = tone === "warn" ? 10 : 6;

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), seconds * 1000);
    const clean = setTimeout(() => router.replace(pathname, { scroll: false }), seconds * 1000 + 400);
    return () => {
      clearTimeout(hide);
      clearTimeout(clean);
    };
  }, [seconds, router, pathname]);

  const close = () => {
    setVisible(false);
    router.replace(pathname, { scroll: false });
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm transition-all duration-300 ${visible ? "opacity-100" : "pointer-events-none h-0 overflow-hidden border-transparent p-0 opacity-0"} ${tone === "warn" ? "border-gold/50 bg-gold/10 text-navy" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      <Icon name={tone === "warn" ? "alert" : "checkCircle"} className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1">{text}</p>
      <button type="button" onClick={close} aria-label="Dismiss message" className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5">
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

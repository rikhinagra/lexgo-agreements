"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/mous", label: "MOUs", match: (p: string) => p === "/admin/mous" || (p.startsWith("/admin/mous/") && p !== "/admin/mous/new") },
  { href: "/admin/mous/new", label: "New MOU", match: (p: string) => p === "/admin/mous/new" },
];

export function AdminNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm font-medium">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 items-center rounded-md px-3 py-2 transition ${active ? "text-white" : "text-white/65 hover:text-white"}`}
          >
            {l.label}
            {active ? <span className={`absolute inset-x-3 h-0.5 rounded-full bg-gold ${compact ? "-bottom-0.5" : "-bottom-[13px]"}`} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

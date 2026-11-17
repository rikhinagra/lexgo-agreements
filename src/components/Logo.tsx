import Link from "next/link";

/** Text logo in the brand font. Swap for the official logo image when it is available. */
export function Logo({ tone = "light", href }: { tone?: "light" | "dark"; href?: string }) {
  const mark = (
    <span className="inline-flex flex-col leading-none">
      <span className={`font-display text-[1.8rem] font-extrabold tracking-tight ${tone === "light" ? "text-white" : "text-navy"}`}>LexGo</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">Agreements</span>
    </span>
  );
  return href ? <Link href={href}>{mark}</Link> : mark;
}

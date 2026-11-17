const STYLES: Record<string, { box: string; dot: string }> = {
  DRAFT: { box: "bg-slate/10 text-slate", dot: "bg-slate" },
  SENT: { box: "bg-blue-50 text-blue-800", dot: "bg-blue-500" },
  VIEWED: { box: "bg-violet-50 text-violet-800", dot: "bg-violet-500" },
  SIGNED: { box: "bg-gold/15 text-[#7a5f00]", dot: "bg-gold" },
  ACTIVE: { box: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  EXPIRED: { box: "bg-orange-50 text-orange-800", dot: "bg-orange-500" },
  CANCELLED: { box: "bg-red-50 text-red-800", dot: "bg-red-500" },
  TERMINATED: { box: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.box}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

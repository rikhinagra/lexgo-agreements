import { Skeleton } from "@/components/Skeleton";

export default function MousLoading() {
  return (
    <div className="space-y-7" role="status" aria-label="Loading MOUs">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex items-center gap-4 p-5">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2"><Skeleton className="h-7 w-12" /><Skeleton className="h-3 w-28" /></div>
          </div>
        ))}
      </div>
      <Skeleton className="h-[74px] w-full rounded-2xl" />
      <div className="card p-0">
        <Skeleton className="h-12 w-full rounded-none rounded-t-2xl" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t border-navy/5 px-6 py-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-56 max-w-full" /></div>
            <Skeleton className="hidden h-4 w-10 sm:block" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/Skeleton";

export default function MouDetailLoading() {
  return (
    <div className="space-y-7" role="status" aria-label="Loading MOU">
      <div>
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-3 w-32" /></div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((c) => (
          <div key={c} className="card min-w-0 space-y-4">
            <Skeleton className="h-6 w-44" />
            {[0, 1, 2, 3, 4].map((r) => (
              <div key={r} className="flex gap-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-40 max-w-full" /></div>
            ))}
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

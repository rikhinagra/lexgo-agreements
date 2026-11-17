import { Skeleton } from "@/components/Skeleton";

export default function NewMouLoading() {
  return (
    <div role="status" aria-label="Loading form">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mb-3 mt-4 h-10 w-48" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_300px]">
        <div className="card space-y-8 p-8">
          {[0, 1, 2].map((s) => (
            <div key={s} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-full rounded-lg" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-full rounded-lg" /></div>
              </div>
            </div>
          ))}
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
        <Skeleton className="hidden h-72 w-full rounded-2xl lg:block" />
      </div>
    </div>
  );
}

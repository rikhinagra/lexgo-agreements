import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-cream">
      <div className="h-[72px] bg-navy" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[26rem]" />
        </div>
      </div>
    </div>
  );
}

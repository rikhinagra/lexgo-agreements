import { Skeleton } from "@/components/Skeleton";

// Shown the instant any admin page starts loading, so the screen never goes blank.
export default function AdminLoading() {
  return (
    <div className="space-y-7" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton layouts that mirror actual content shapes.
 * Use these instead of spinners — perceived performance matters.
 */

export function StatCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60">
      <Skeleton className="h-1 w-full rounded-none" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="mt-4 h-9 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
    </div>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60", className)}>
      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/6" />
        <Skeleton className="h-3 w-1/6" />
        <Skeleton className="h-3 w-1/6" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-[52px] items-center gap-4 border-b border-border/60 px-4 last:border-0"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-border/60 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
        <Skeleton className="mt-4 h-3 w-full rounded-full" />
      </div>
      <StatCardGridSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TableSkeleton rows={4} />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}

import { DashboardSkeleton } from "@/components/ui/loading-skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1400px]">
        <DashboardSkeleton />
      </div>
    </div>
  );
}

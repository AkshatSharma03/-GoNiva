import { Skeleton } from "~/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero skeleton */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-64 rounded-full" />
          <Skeleton className="h-16 w-3/4 max-w-xl" />
          <Skeleton className="h-6 w-1/2 max-w-sm" />
        </div>
        {/* Search card skeleton */}
        <div className="mx-auto mb-10 max-w-4xl rounded-2xl border border-border bg-card/80 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-9 lg:col-span-2" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="ml-auto h-9 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

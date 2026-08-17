import { Skeleton } from "@/components/ui/skeleton";

export default function PropertyDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-card border border-border bg-surface p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}

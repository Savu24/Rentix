import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function NewPropertyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <FormSkeleton />
    </div>
  );
}

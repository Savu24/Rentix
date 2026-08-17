import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function EditPropertyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-72" />
      </div>
      <FormSkeleton />
    </div>
  );
}

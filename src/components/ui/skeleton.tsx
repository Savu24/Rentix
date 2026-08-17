import { cn } from "@/lib/utils";

/** Placeholder ładowania. Kształtem naśladuje treść, która się pojawi. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-control bg-surface-alt", className)}
      {...props}
    />
  );
}

/**
 * Szkielet formularza w karcie.
 *
 * `loading.tsx` obowiązuje także podstrony segmentu, więc każda z nich —
 * lista, szczegóły, formularz — potrzebuje własnego pliku o właściwym
 * kształcie. Inaczej wchodząc w szczegóły widać przez chwilę szkielet listy.
 */
export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-card border border-border bg-surface p-5">
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      ))}
      <Skeleton className="h-10 w-44" />
    </div>
  );
}

/** Szkielet karty nieruchomości — używany przez loading.tsx listy. */
export function PropertyCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-control" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

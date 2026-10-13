import { cn } from "@/lib/utils";

/**
 * Placeholder ładowania. Kształtem naśladuje treść, która się pojawi.
 * Zagłębione tło z jaśniejszym pasem pośrodku (`hover`), tak jak
 * `gr-skeleton` w redesignie; pulsowanie wygasza `prefers-reduced-motion`.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-control bg-surface-alt",
        "bg-[linear-gradient(90deg,var(--sunken)_0%,var(--hover)_50%,var(--sunken)_100%)]",
        className,
      )}
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
        <div key={index} className="rounded-tile border border-border bg-surface p-4 lg:rounded-card lg:p-6">
          <Skeleton className="mb-4 h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
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
    <div className="rounded-tile border border-border bg-surface p-4 lg:rounded-card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-control" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-badge" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Szkielet listy wierszy (redesign/_generator/screens/common.mjs,
 * `skeletonRows`): kafelek, dwie linijki, wartość i plakietka.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-[72px] items-center gap-4 border-t border-border px-4 first:border-t-0 lg:px-6"
        >
          <Skeleton className="size-10 shrink-0 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5 max-w-60" />
            <Skeleton className="h-2.5 w-1/4 max-w-36" />
          </div>
          <Skeleton className="hidden h-3 w-24 lg:block" />
          <Skeleton className="h-5 w-24 rounded-badge" />
        </div>
      ))}
    </div>
  );
}

/** Szkielet nagłówka strony, paska filtrów i listy pod nim. */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-44 rounded-btn" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <Skeleton className="h-10 lg:w-80" />
        <Skeleton className="h-9 lg:w-96" />
      </div>
      <ListSkeleton rows={rows} />
    </div>
  );
}

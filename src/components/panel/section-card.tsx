import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Karta-sekcja ekranu szczegółów (redesign/_generator/lib.mjs, `panel`):
 * tytuł 15/600 z ewentualną ikoną i licznikiem, akcje po prawej, stopka
 * z sumą oddzielona linią. Linia 1 px, bez cienia.
 */
export function SectionCard({
  title,
  icon: Icon,
  count,
  actions,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** Licznik obok tytułu: liczba albo krótki tekst („2/3 zajęte"). */
  count?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-tile border border-border bg-surface lg:rounded-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 lg:px-6 lg:pt-5">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[15px] leading-6 font-semibold text-fg">
          {Icon ? <Icon className="size-[18px] shrink-0 text-subtle" aria-hidden /> : null}
          <span className="truncate">{title}</span>
          {count !== undefined && count !== null ? <Badge size="sm">{count}</Badge> : null}
        </h2>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("flex-1 px-4 pt-3 pb-4 lg:px-6 lg:pb-5", bodyClassName)}>{children}</div>
      {footer ? (
        <footer className="flex min-h-[52px] items-center justify-between gap-3 border-t border-border px-4 lg:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/**
 * Wiersze w karcie z kreskami między sobą, odsuniętymi od krawędzi
 * (jak `line(x + 24, …)` w projekcie). Sam kontener — wiersz rysuje wołający.
 */
export function CardRows({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "-mx-4 lg:-mx-6 [&>li]:relative [&>li]:px-4 lg:[&>li]:px-6 [&>li+li]:before:absolute [&>li+li]:before:inset-x-4",
        "[&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-border lg:[&>li+li]:before:inset-x-6",
        className,
      )}
      {...props}
    />
  );
}

/** Para „etykieta nad wartością" w siatce danych (`dItem` w projekcie). */
export function DataItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-[12.5px] font-medium text-subtle">{label}</dt>
      <dd className="text-sm font-medium break-words text-fg">{children}</dd>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Stan pusty.
 *
 * Rozróżnia dwa przypadki, bo wymagają różnych komunikatów: „jeszcze nic tu
 * nie ma" prowadzi do dodania pierwszego rekordu, a „filtr nic nie znalazł"
 * do wyczyszczenia filtra. Pokazanie tego pierwszego, gdy zawinił filtr,
 * sugeruje użytkownikowi, że stracił dane.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-tile border border-border bg-surface",
        "px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-tile bg-accent-soft">
        <Icon className="size-7 text-accent" strokeWidth={1.6} aria-hidden />
      </span>

      <div className="flex flex-col gap-1.5">
        <p className="text-lg leading-6 font-semibold text-fg">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>

      {action ? <div className="flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

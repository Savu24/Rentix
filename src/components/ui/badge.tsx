import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Znacznik statusu.
 *
 * Statusy zawsze niosą etykietę tekstową obok koloru — kolory `--good`,
 * `--warn` i `--bad` siedzą blisko siebie dla osób z deuteranopią, więc sam
 * kolor nie może być nośnikiem znaczenia (patrz docs/chart-palette.md).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-alt text-muted",
        good: "bg-good-soft text-good",
        warning: "bg-warn-soft text-warn",
        critical: "bg-bad-soft text-bad",
        accent: "bg-accent-soft text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Kropka statusu — do list, gdzie pełny znacznik byłby za ciężki. */
export function StatusDot({ tone = "neutral" }: { tone?: BadgeProps["tone"] }) {
  const color = {
    neutral: "bg-muted",
    good: "bg-good",
    warning: "bg-warn",
    critical: "bg-bad",
    accent: "bg-accent",
  }[tone ?? "neutral"];

  return <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden />;
}

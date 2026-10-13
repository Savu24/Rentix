import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Znacznik statusu: kolor + ikona + jedno-dwa słowa.
 *
 * Statusy zawsze niosą etykietę tekstową obok koloru — kolory `--good`,
 * `--warn` i `--bad` siedzą blisko siebie dla osób z deuteranopią, więc sam
 * kolor nie może być nośnikiem znaczenia (patrz docs/chart-palette.md).
 *
 * Tło jest miękkie, tekst w ciemniejszym odcieniu tonu, a ikona w pełnym
 * kolorze tonu — tak rysuje je redesign/01-design-system.svg.
 */
const badgeVariants = cva(
  cn(
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-badge font-[550] leading-none",
    "[&_svg]:shrink-0",
  ),
  {
    variants: {
      tone: {
        neutral: "bg-surface-alt text-muted [&_svg]:text-muted",
        accent: "bg-accent-soft text-accent [&_svg]:text-accent",
        good: "bg-good-soft text-good-ink [&_svg]:text-good",
        warning: "bg-warn-soft text-warn-ink [&_svg]:text-warn",
        critical: "bg-bad-soft text-bad-ink [&_svg]:text-bad",
        info: "bg-info-soft text-info-ink [&_svg]:text-info",
        /** Blokada planu („Plan Pro"). */
        amber: "bg-highlight-soft text-warn-ink [&_svg]:text-warn",
        outline: "border border-border-strong text-muted [&_svg]:text-subtle",
      },
      size: {
        md: "h-6 gap-[5px] px-[9px] text-[12.5px] [&_svg]:size-3.5",
        sm: "h-5 gap-[5px] px-[7px] text-[11.5px] [&_svg]:size-3",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Ikona przed etykietą. Statusy dokumentów, umów i lokali mają ją zawsze. */
    icon?: LucideIcon;
  };

export function Badge({ className, tone, size, icon: Icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {Icon ? <Icon strokeWidth={2} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Kropka statusu — do list, gdzie pełny znacznik byłby za ciężki. */
export function StatusDot({ tone = "neutral" }: { tone?: BadgeProps["tone"] }) {
  const color = {
    neutral: "bg-subtle",
    accent: "bg-accent",
    good: "bg-good",
    warning: "bg-warn",
    critical: "bg-bad",
    info: "bg-info",
    amber: "bg-warn",
    outline: "bg-subtle",
  }[tone ?? "neutral"];

  return <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden />;
}

export { badgeVariants };

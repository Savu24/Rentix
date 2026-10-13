import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Karta — podstawowa powierzchnia treści. Linia 1 px, bez cienia: cień
 * dostają tylko elementy pływające. Na telefonie promień 16 i odstęp 16,
 * od `lg` promień 14 i odstęp 24 (redesign/_generator/lib.mjs, `panel`).
 */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-tile border border-border bg-surface [--card-pad:1rem] lg:rounded-card lg:[--card-pad:1.5rem]", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-[var(--card-pad)] pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-[15px] leading-6 font-semibold text-fg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[13px] text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-[var(--card-pad)]", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 p-[var(--card-pad)] pt-0", className)} {...props} />;
}

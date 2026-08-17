import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-fg",
        "transition-colors placeholder:text-muted",
        "hover:border-muted",
        "focus-visible:border-accent focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Pole z błędem: czerwona ramka + czerwony pierścień, ustawiane przez aria-invalid.
        "aria-[invalid=true]:border-bad aria-[invalid=true]:focus-visible:ring-bad/25",
        className,
      )}
      {...props}
    />
  );
}

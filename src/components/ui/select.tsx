import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Natywny `<select>` w skórce design systemu.
 *
 * Natywny, a nie na Radiksie: na telefonie otwiera systemowy picker, który jest
 * wygodniejszy od listy renderowanej w DOM-ie, a to narzędzie ma być realnie
 * używalne na telefonie.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-11 w-full appearance-none rounded-control border border-border bg-surface",
          "pl-3.5 pr-10 text-sm text-fg transition-colors",
          "hover:border-muted",
          "focus-visible:border-accent focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-bad aria-[invalid=true]:focus-visible:ring-bad/25",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

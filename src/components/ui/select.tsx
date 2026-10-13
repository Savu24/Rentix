import { ChevronDown } from "lucide-react";
import * as React from "react";

import { fieldControl } from "@/components/ui/input";
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
    <div className="relative min-w-0">
      <select
        data-slot="select"
        className={cn(fieldControl, "h-10 appearance-none pl-3 pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-subtle"
        aria-hidden
      />
    </div>
  );
}

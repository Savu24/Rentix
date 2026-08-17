import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-fg",
        "resize-y transition-colors placeholder:text-muted",
        "hover:border-muted",
        "focus-visible:border-accent focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-bad aria-[invalid=true]:focus-visible:ring-bad/25",
        className,
      )}
      {...props}
    />
  );
}

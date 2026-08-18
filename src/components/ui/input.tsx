import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // `min-w-0`: w siatce i flexie element nie zwęża się poniżej swojej
        // zawartości, dopóki mu się tego nie pozwoli. Patrz komentarz w `FormField`.
        "h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3.5 text-sm text-fg",
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

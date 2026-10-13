import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skórka wspólna dla pola, listy wyboru i obszaru tekstu
 * (redesign/_generator/lib.mjs, `field`): obrys `line2`, promień 8,
 * tekst 14 px. Fokus to obrys w kolorze marki z miękką poświatą, błąd
 * (`aria-invalid`) — czerwony obrys. Wyłączone pole nie blednie, tylko
 * przechodzi na zagłębione tło z wygaszonym tekstem.
 */
export const fieldControl = cn(
  "w-full min-w-0 rounded-control border border-border-strong bg-surface text-sm text-fg",
  "transition-[border-color,box-shadow] placeholder:text-subtle",
  "hover:border-subtle",
  "focus-visible:border-accent focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-accent-soft",
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-alt disabled:text-subtle",
  "aria-[invalid=true]:border-bad aria-[invalid=true]:focus-visible:ring-bad-soft",
);

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // `min-w-0` (w `fieldControl`): w siatce i flexie element nie zwęża się
        // poniżej swojej zawartości, dopóki mu się tego nie pozwoli. Patrz
        // komentarz w `FormField`.
        fieldControl,
        "h-10 px-3",
        className,
      )}
      {...props}
    />
  );
}

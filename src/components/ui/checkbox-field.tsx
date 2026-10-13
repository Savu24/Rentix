import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pole wyboru na natywnym `<input type="checkbox">`.
 *
 * Kontrolka zostaje natywna — klawiatura i czytniki ekranu działają bez
 * dopisywania ról ARIA — a zdejmujemy z niej tylko wygląd systemowy.
 * Kwadrat 18 px z promieniem 5 i ptaszek rysujemy sami, bo `accent-color`
 * nie daje ani obrysu, ani koloru ptaszka z tokenów, a w ciemnym motywie
 * jasna zieleń z białym ptaszkiem była nieczytelna.
 */
export const CheckboxField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { label: string; hint?: string }
>(function CheckboxField({ className, label, hint, id, ...props }, ref) {
  // useId musi zostać wywołane bezwarunkowo — `id ?? React.useId()` pomijałoby
  // hook, gdy `id` przyszło z zewnątrz, i rozjeżdżało kolejność hooków
  // między renderami tego samego komponentu.
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-px inline-flex size-[18px] shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "peer size-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px]",
            "border border-border-strong bg-surface transition-colors",
            "checked:border-accent checked:bg-accent",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            "disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-alt",
            "disabled:checked:border-subtle disabled:checked:bg-subtle",
            className,
          )}
          {...props}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-accent-contrast opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-sm leading-5 text-fg">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[12.5px] leading-[18px] text-subtle">{hint}</span>
        ) : null}
      </label>
    </div>
  );
});

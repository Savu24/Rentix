import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pole wyboru na natywnym `<input type="checkbox">`.
 *
 * `accent-color` zamiast własnej grafiki: natywna kontrolka zachowuje
 * obsługę klawiatury i czytników ekranu bez dopisywania ról ARIA.
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
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-border",
          "accent-[var(--accent)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
});

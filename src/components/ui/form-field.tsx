
import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Pole formularza: etykieta + kontrolka + komunikat błędu.
 *
 * Wiąże je przez `id`/`aria-describedby`, więc czytnik ekranu przeczyta
 * komunikat razem z polem, a `role="alert"` sprawia, że zgłosi go
 * natychmiast po nieudanej walidacji.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  className,
  labelClassName,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Np. `lg:sr-only` w wierszach tabeli, gdzie etykietę niesie nagłówek kolumny. */
  labelClassName?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    /*
      `min-w-0` jest tu obowiązkowe, nie kosmetyczne.

      Element siatki ma domyślnie `min-width: auto`, czyli nie zwęzi się poniżej
      swojej zawartości. Pole daty ma własną szerokość minimalną (pełny format
      plus przycisk kalendarza), więc kolumna rozpychała się ponad szerokość karty
      i cały formularz wyjeżdżał poza ekran telefonu.
    */
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>

      {children}

      {hint && !error ? (
        <p id={hintId} className="mt-1 text-[12.5px] leading-[18px] text-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-[18px] font-medium text-bad"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Zwraca atrybuty a11y dla kontrolki wewnątrz <FormField>. */
export function fieldAria(id: string, { error, hint }: { error?: string; hint?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;
}

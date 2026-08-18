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
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    /*
      `min-w-0` jest tu obowiązkowe, nie kosmetyczne.

      Element siatki ma domyślnie `min-width: auto`, czyli nie zwęzi się poniżej
      swojej zawartości. Natywny `input[type="date"]` na iOS ma własną szerokość
      minimalną (pełny format daty plus ikona kalendarza), więc kolumna rozpychała
      się ponad szerokość karty i cały formularz wyjeżdżał poza ekran telefonu.
    */
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-bad">
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

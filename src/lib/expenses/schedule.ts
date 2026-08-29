import type { ExpenseRecurrence } from "@/generated/prisma/enums";

/**
 * Arytmetyka terminów kosztu cyklicznego.
 *
 * Osobno od naliczania, bo to czysta funkcja daty — bez bazy da się ją
 * sprawdzić testem na wszystkich brzegach kalendarza, o które tu chodzi.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ile dni ma miesiąc — do przycięcia 31. dnia w lutym. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Następny termin po `current`.
 *
 * Dzień miesiąca bierzemy z `anchor`, czyli z pierwszej pozycji, a nie
 * z poprzedniego terminu. Inaczej koszt płacony 31. dnia przesunąłby się
 * w lutym na 28. i już by tak został — po roku wypadałby o trzy dni za
 * wcześnie względem tego, co właściciel wpisał.
 */
export function nextOccurrence(
  anchor: Date,
  current: Date,
  recurrence: ExpenseRecurrence,
  everyDays: number | null,
): Date {
  switch (recurrence) {
    case "WEEKLY":
      return addDays(current, 7);

    case "CUSTOM":
      // Bez odstępu cykl nie ma sensu; walidacja go wymaga, a tutaj chodzi
      // tylko o to, żeby pętla naliczania zawsze szła do przodu.
      return addDays(current, Math.max(1, everyDays ?? 1));

    case "MONTHLY":
    case "YEARLY": {
      const step = recurrence === "MONTHLY" ? 1 : 12;
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth() + step;

      // Date.UTC samo przenosi miesiąc 12 na styczeń kolejnego roku.
      const target = new Date(Date.UTC(year, month, 1));
      const day = Math.min(
        anchor.getUTCDate(),
        daysInMonth(target.getUTCFullYear(), target.getUTCMonth()),
      );

      return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
    }
  }
}

/**
 * Składanie raportu rocznego z surowych rekordów — bez dostępu do bazy.
 *
 * Wydzielone jak reguły w `src/lib/invoices/rules.ts`: to tutaj mieszka
 * arytmetyka, którą trzeba umieć sprawdzić testem.
 *
 * Wszystko liczymy **kasowo**, po dacie faktycznego przepływu pieniędzy:
 * wpłaty po `paidAt`, koszty po `paidAt`. Najem prywatny rozlicza się ryczałtem
 * od przychodu otrzymanego, a nie zafakturowanego, więc zestawienie liczone
 * po dacie wystawienia dokumentu nie zgadzałoby się z zeznaniem.
 */

import type { Locale } from "@/lib/i18n/config";
import { monthNames } from "@/lib/i18n/format";

export type CashEntry = {
  /** Data przepływu — po niej trafia do miesiąca. */
  at: Date;
  amountGrosze: number;
  /** NULL = pozycja ogólna, nieprzypisana do nieruchomości. */
  propertyId: string | null;
};

export type MonthlyRow = {
  /** Miesiąc liczony od zera, jak w `Date`. */
  month: number;
  label: string;
  incomeGrosze: number;
  expenseGrosze: number;
  profitGrosze: number;
};

/**
 * Dwanaście wierszy, także dla miesięcy bez żadnego ruchu.
 *
 * Miesiąc pusty musi zostać w tabeli i na wykresie: dziura w osi czasu
 * czytałaby się jak brak danych, a nie jak zero — a w najmie „zero wpływów
 * w lutym" to najważniejsza informacja, jaka może paść.
 */
export function monthlyBreakdown(
  income: readonly CashEntry[],
  expenses: readonly CashEntry[],
  locale: Locale,
): MonthlyRow[] {
  const rows: MonthlyRow[] = monthNames(locale).map((label, month) => ({
    month,
    label,
    incomeGrosze: 0,
    expenseGrosze: 0,
    profitGrosze: 0,
  }));

  for (const entry of income) rows[entry.at.getUTCMonth()]!.incomeGrosze += entry.amountGrosze;
  for (const entry of expenses) rows[entry.at.getUTCMonth()]!.expenseGrosze += entry.amountGrosze;

  for (const row of rows) row.profitGrosze = row.incomeGrosze - row.expenseGrosze;

  return rows;
}

export type PropertyRow = {
  propertyId: string | null;
  name: string;
  incomeGrosze: number;
  expenseGrosze: number;
  profitGrosze: number;
};

/**
 * Wynik w rozbiciu na nieruchomości.
 *
 * Pozycje bez przypisania (księgowość, obsługa prawna) lądują w osobnym
 * wierszu, a nie są rozdzielane po nieruchomościach proporcjonalnie: każdy
 * klucz podziału byłby zmyślony, a zmyślona liczba w raporcie jest gorsza
 * niż jawne „koszty ogólne".
 */
export function propertyBreakdown(
  income: readonly CashEntry[],
  expenses: readonly CashEntry[],
  names: ReadonlyMap<string, string>,
  labels: { deletedProperty: string; generalCosts: string },
): PropertyRow[] {
  const rows = new Map<string, PropertyRow>();

  const bucket = (propertyId: string | null): PropertyRow => {
    const key = propertyId ?? "";
    const existing = rows.get(key);
    if (existing) return existing;

    const row: PropertyRow = {
      propertyId,
      name: propertyId ? (names.get(propertyId) ?? labels.deletedProperty) : labels.generalCosts,
      incomeGrosze: 0,
      expenseGrosze: 0,
      profitGrosze: 0,
    };
    rows.set(key, row);
    return row;
  };

  for (const entry of income) bucket(entry.propertyId).incomeGrosze += entry.amountGrosze;
  for (const entry of expenses) bucket(entry.propertyId).expenseGrosze += entry.amountGrosze;

  for (const row of rows.values()) row.profitGrosze = row.incomeGrosze - row.expenseGrosze;

  // Najpierw nieruchomości wg zysku malejąco, koszty ogólne zawsze na końcu —
  // to nie jest nieruchomość, więc nie konkuruje z nimi w rankingu.
  return [...rows.values()].sort((a, b) => {
    if (a.propertyId === null) return 1;
    if (b.propertyId === null) return -1;
    return b.profitGrosze - a.profitGrosze;
  });
}

export type CollectionInput = {
  dueDate: Date;
  totalGrossGrosze: number;
  paidGrosze: number;
  /** Data ostatniej wpłaty; NULL, gdy nic nie wpłynęło. */
  lastPaymentAt: Date | null;
};

export type CollectionStats = {
  invoicedCount: number;
  paidCount: number;
  /** Odsetek rozliczonych dokumentów, 0–100. */
  collectionRate: number;
  /** Ile z rozliczonych zapłacono po terminie. */
  lateCount: number;
  /** Średnie opóźnienie liczone tylko z tych zapłaconych po terminie. */
  averageDelayDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDayUtc = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Ściągalność: ile rachunków zostało rozliczonych i z jakim poślizgiem.
 *
 * Średnie opóźnienie liczymy wyłącznie z faktur zapłaconych po terminie.
 * Wciągnięcie tych zapłaconych przed czasem z ujemnym opóźnieniem
 * wyzerowałoby wynik i pokazało „0 dni" właścicielowi, któremu połowa
 * najemców płaci dwa tygodnie po terminie.
 */
export function collectionStats(invoices: readonly CollectionInput[]): CollectionStats {
  const settled = invoices.filter(
    (invoice) => invoice.paidGrosze >= invoice.totalGrossGrosze && invoice.lastPaymentAt,
  );

  const delays = settled
    .map((invoice) =>
      Math.round((startOfDayUtc(invoice.lastPaymentAt!) - startOfDayUtc(invoice.dueDate)) / DAY_MS),
    )
    .filter((days) => days > 0);

  return {
    invoicedCount: invoices.length,
    paidCount: settled.length,
    collectionRate:
      invoices.length === 0 ? 0 : Math.round((settled.length / invoices.length) * 100),
    lateCount: delays.length,
    averageDelayDays:
      delays.length === 0
        ? 0
        : Math.round(delays.reduce((total, days) => total + days, 0) / delays.length),
  };
}

/**
 * Kwota w komórce CSV.
 *
 * Separator dziesiętny idzie za krajem konta, bo arkusz czyta go po swojemu:
 * polski Excel z kropką pokazałby „1234.50" jako tekst, brytyjski z przecinkiem
 * — jako dwie kolumny. Separatorem pól jest średnik w obu przypadkach, więc
 * przecinek dziesiętny nie rozbija wiersza (patrz `buildCsv`).
 */
export function toCsvAmount(grosze: number, locale: Locale = "pl"): string {
  const value = (grosze / 100).toFixed(2);
  return locale === "pl" ? value.replace(".", ",") : value;
}

/**
 * Składa CSV.
 *
 * Separatorem jest średnik, a nie przecinek: polski Excel czyta przecinek jako
 * część liczby, więc plik rozjechałby się na kolumny w złych miejscach.
 * Na początku idzie BOM — bez niego Excel otwiera UTF-8 jako windows-1250
 * i polskie znaki zamieniają się w krzaki.
 */
export function buildCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const escape = (cell: string) =>
    /[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

import type { InvoiceKind, InvoiceStatus, ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";
import type { Locale } from "@/lib/i18n/config";
import { formatDateIn } from "@/lib/i18n/format";

import { toCsvAmount } from "./aggregate";

/**
 * Eksport księgowy: kształt danych, zakresy i składanie arkusza.
 *
 * Bez Prismy — zapytania mieszkają w `accounting-server.ts`, tak samo jak
 * `billing/plans.ts` stoi obok `billing/server.ts`. Tutaj sięga też komponent
 * przeglądarki (po listę zakresów), a ten nie ma prawa wciągnąć klienta bazy.
 *
 * Czym różni się od zestawienia rocznego (`service.ts`): tamto jest raportem
 * dla wynajmującego — sumy, wykres, ściągalność. To jest wyciąg pozycja po
 * pozycji dla księgowego, który musi mieć czym obłożyć zapisy. Stąd wiersz na
 * każdy dokument i każdą wpłatę, z numerem, datą i danymi nabywcy, a nie sumy
 * miesięczne.
 *
 * Dwie sekcje z premedytacją liczą co innego:
 *
 * - **dokumenty** po dacie wystawienia — rejestr sprzedaży prowadzi się
 *   memoriałowo, dokument z grudnia należy do grudnia niezależnie od zapłaty;
 * - **wpłaty i koszty** po dacie przepływu — najem prywatny rozlicza się
 *   ryczałtem od przychodu otrzymanego.
 *
 * Zsumowanie ich do jednej liczby byłoby więc błędem i dlatego podsumowanie
 * pokazuje obie kwoty osobno, a nie jedno „razem".
 */

export type DateRange = { from: Date; to: Date };

export type DocumentRecord = {
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  issueDate: Date;
  saleDate: Date;
  dueDate: Date;
  buyerName: string;
  buyerTaxId: string | null;
  propertyName: string | null;
  totalNetGrosze: number;
  totalVatGrosze: number;
  totalGrossGrosze: number;
  paidGrosze: number;
};

export type PaymentRecord = {
  paidAt: Date;
  invoiceNumber: string;
  payerName: string;
  amountGrosze: number;
  method: PaymentMethod;
  reference: string | null;
};

export type ExpenseRecord = {
  paidAt: Date;
  category: ExpenseCategory;
  description: string;
  vendor: string | null;
  documentRef: string | null;
  propertyName: string | null;
  amountGrosze: number;
};

export type AccountingExport = {
  range: DateRange;
  documents: DocumentRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  totals: {
    /** Sprzedaż brutto z dokumentów — memoriałowo. */
    invoicedGrosze: number;
    invoicedNetGrosze: number;
    invoicedVatGrosze: number;
    /** Wpływy — kasowo. */
    receivedGrosze: number;
    /** Koszty — kasowo. */
    expensesGrosze: number;
  };
};

/** Sekcje, które da się pobrać osobno. */
export const EXPORT_SCOPES = ["all", "documents", "payments", "expenses"] as const;

export type ExportScope = (typeof EXPORT_SCOPES)[number];

export function isExportScope(value: string | null): value is ExportScope {
  return value !== null && (EXPORT_SCOPES as readonly string[]).includes(value);
}

/**
 * Zakres dat z parametrów adresu.
 *
 * Górna granica jest domknięta od strony użytkownika („do 31 grudnia" ma objąć
 * cały 31 grudnia), a w zapytaniu idzie jako `lt` następnej północy — daty
 * trzymamy w UTC, więc `lte` na samej dacie ucinałoby wszystko po godzinie 0:00.
 */
export function parseRange(
  from: string | null,
  to: string | null,
  fallbackYear: number,
): DateRange {
  const parse = (value: string | null): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const start = parse(from) ?? new Date(Date.UTC(fallbackYear, 0, 1));
  const end = parse(to) ?? new Date(Date.UTC(fallbackYear, 11, 31));

  // Odwrócony zakres to zwykła pomyłka w formularzu, a nie powód do błędu:
  // prostujemy go zamiast zwracać pusty plik, po którym nie widać przyczyny.
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

// ── Składanie arkusza ───────────────────────────────────────────────────────

/** Napisy sekcji — wchodzą z zewnątrz, żeby ten plik nie znał słowników. */
export type ExportLabels = {
  heading: string;
  documents: {
    title: string;
    columns: string[];
    kinds: Record<InvoiceKind, string>;
    statuses: Record<InvoiceStatus, string>;
  };
  payments: {
    title: string;
    columns: string[];
    methods: Record<PaymentMethod, string>;
  };
  expenses: {
    title: string;
    columns: string[];
    categories: Record<ExpenseCategory, string>;
  };
  summary: {
    title: string;
    invoiced: string;
    invoicedNet: string;
    invoicedVat: string;
    received: string;
    expenses: string;
    result: string;
  };
  /** Pozycja bez przypisanej nieruchomości. */
  unassigned: string;
};

/**
 * Wiersze arkusza. Czysta funkcja — bez niej sprawdzenie eksportu wymagałoby
 * bazy, a najłatwiej pomylić się właśnie tutaj: w kolejności kolumn i w tym,
 * która sekcja liczy memoriałowo, a która kasowo.
 */
export function accountingCsvRows(
  data: AccountingExport,
  scope: ExportScope,
  locale: Locale,
  labels: ExportLabels,
): string[][] {
  const rows: string[][] = [];
  const date = (value: Date) => formatDateIn(value, locale, "short");
  const amount = (grosze: number) => toCsvAmount(grosze, locale);
  const wants = (section: ExportScope) => scope === "all" || scope === section;

  if (wants("documents")) {
    rows.push([labels.documents.title]);
    rows.push(labels.documents.columns);

    for (const row of data.documents) {
      rows.push([
        row.number,
        labels.documents.kinds[row.kind],
        date(row.issueDate),
        date(row.saleDate),
        date(row.dueDate),
        row.buyerName,
        row.buyerTaxId ?? "",
        row.propertyName ?? labels.unassigned,
        amount(row.totalNetGrosze),
        amount(row.totalVatGrosze),
        amount(row.totalGrossGrosze),
        amount(row.paidGrosze),
        amount(row.totalGrossGrosze - row.paidGrosze),
        labels.documents.statuses[row.status],
      ]);
    }
  }

  if (wants("payments")) {
    if (rows.length > 0) rows.push([]);
    rows.push([labels.payments.title]);
    rows.push(labels.payments.columns);

    for (const row of data.payments) {
      rows.push([
        date(row.paidAt),
        row.invoiceNumber,
        row.payerName,
        amount(row.amountGrosze),
        labels.payments.methods[row.method],
        row.reference ?? "",
      ]);
    }
  }

  if (wants("expenses")) {
    if (rows.length > 0) rows.push([]);
    rows.push([labels.expenses.title]);
    rows.push(labels.expenses.columns);

    for (const row of data.expenses) {
      rows.push([
        date(row.paidAt),
        labels.expenses.categories[row.category],
        row.description,
        row.vendor ?? "",
        row.documentRef ?? "",
        row.propertyName ?? labels.unassigned,
        amount(row.amountGrosze),
      ]);
    }
  }

  // Podsumowanie tylko przy komplecie: przy pojedynczej sekcji sumowałoby
  // pozycje, których w pliku nie ma.
  if (scope === "all") {
    rows.push([]);
    rows.push([labels.summary.title]);
    rows.push([labels.summary.invoicedNet, amount(data.totals.invoicedNetGrosze)]);
    rows.push([labels.summary.invoicedVat, amount(data.totals.invoicedVatGrosze)]);
    rows.push([labels.summary.invoiced, amount(data.totals.invoicedGrosze)]);
    rows.push([labels.summary.received, amount(data.totals.receivedGrosze)]);
    rows.push([labels.summary.expenses, amount(data.totals.expensesGrosze)]);
    rows.push([
      labels.summary.result,
      amount(data.totals.receivedGrosze - data.totals.expensesGrosze),
    ]);
  }

  return rows;
}

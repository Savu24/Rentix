import type { InvoiceStatus } from "@/generated/prisma/enums";

/**
 * Status faktury pokazywany użytkownikowi.
 *
 * W bazie trzymamy wyłącznie stan rozliczenia (`InvoiceStatus`). „Zaległa"
 * i „nadchodząca" to funkcje bieżącej daty, więc wyliczamy je tutaj.
 *
 * Dlaczego nie kolumna w bazie: zaległość zaczyna się o północy dnia po
 * terminie. Zapisany status wymagałby zadania cyklicznego przestawiającego
 * rekordy każdej nocy — a między jego przebiegami dane i tak byłyby nieaktualne.
 * Indeks (organizationId, status, dueDate) sprawia, że filtrowanie po tym
 * wyliczeniu jest tanie po stronie Postgresa.
 */
export type DisplayInvoiceStatus =
  | "DRAFT" // szkic
  | "PAID" // opłacona
  | "PARTIALLY_PAID" // opłacona częściowo
  | "OVERDUE" // zaległość — po terminie
  | "DUE_SOON" // termin w ciągu najbliższych dni
  | "UPCOMING" // termin w przyszłości
  | "CANCELLED"; // anulowana

/** Ile dni przed terminem faktura wchodzi w stan „zbliża się termin". */
export const DUE_SOON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Północ danego dnia w UTC — porównujemy dni, nie chwile. */
function startOfDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Liczba pełnych dni od `dueDate` do `now`. Dodatnia = po terminie.
 *
 * Liczymy na granicach dni, nie na godzinach: faktura z terminem na dziś nie
 * jest zaległa o 23:59, a jest jutro o 00:01.
 */
export function daysOverdue(dueDate: Date, now: Date): number {
  return Math.round((startOfDayUtc(now) - startOfDayUtc(dueDate)) / DAY_MS);
}

export type InvoiceLike = {
  status: InvoiceStatus;
  dueDate: Date;
  totalGrossGrosze: number;
  paidGrosze: number;
};

export function resolveInvoiceStatus(
  invoice: InvoiceLike,
  now: Date = new Date(),
): DisplayInvoiceStatus {
  // Stany końcowe nie zależą od daty.
  if (invoice.status === "CANCELLED") return "CANCELLED";
  if (invoice.status === "DRAFT") return "DRAFT";
  if (invoice.status === "PAID") return "PAID";

  // Faktura rozliczona co do grosza jest opłacona, nawet jeśli kolumna `status`
  // jeszcze tego nie odnotowała — a nadpłata też liczy się jako opłacona.
  if (invoice.paidGrosze >= invoice.totalGrossGrosze) return "PAID";

  const overdueDays = daysOverdue(invoice.dueDate, now);

  // Zaległość ma pierwszeństwo przed częściową wpłatą: właściciela interesuje
  // przede wszystkim to, że pieniędzy nie ma po terminie.
  if (overdueDays > 0) return "OVERDUE";
  if (invoice.paidGrosze > 0) return "PARTIALLY_PAID";
  if (overdueDays > -DUE_SOON_DAYS) return "DUE_SOON";

  return "UPCOMING";
}

/** Ile jeszcze zostało do zapłaty. Nigdy ujemne — nadpłata to osobny temat. */
export function remainingGrosze(invoice: InvoiceLike): number {
  return Math.max(0, invoice.totalGrossGrosze - invoice.paidGrosze);
}

/** Etykieta i token statusu z design systemu — patrz docs/chart-palette.md. */
export const INVOICE_STATUS_META: Record<
  DisplayInvoiceStatus,
  { label: string; tone: "neutral" | "good" | "warning" | "critical" }
> = {
  DRAFT: { label: "Szkic", tone: "neutral" },
  PAID: { label: "Opłacona", tone: "good" },
  PARTIALLY_PAID: { label: "Opłacona częściowo", tone: "warning" },
  DUE_SOON: { label: "Zbliża się termin", tone: "warning" },
  OVERDUE: { label: "Zaległość", tone: "critical" },
  UPCOMING: { label: "Nadchodząca", tone: "neutral" },
  CANCELLED: { label: "Anulowana", tone: "neutral" },
};

/**
 * Warunek Prismy wybierający faktury zaległe na dany dzień.
 *
 * Trzymany obok wyliczenia powyżej, żeby definicja „zaległej" istniała
 * w jednym miejscu — inaczej UI i zapytania rozjechałyby się przy pierwszej
 * zmianie reguły.
 */
export function overdueWhere(now: Date = new Date()) {
  return {
    status: { in: ["ISSUED", "PARTIALLY_PAID"] as InvoiceStatus[] },
    dueDate: { lt: new Date(startOfDayUtc(now)) },
  };
}

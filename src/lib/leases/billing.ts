import type { UtilitiesMode, VatRate } from "@/generated/prisma/enums";
import type { InvoiceLineInput } from "@/lib/invoices/totals";
import { roundHalf } from "@/lib/money";

/**
 * Naliczanie czynszu za okres rozliczeniowy.
 *
 * Wszystkie daty liczone w UTC. Gdyby użyć czasu lokalnego, ta sama umowa
 * dawałaby inny okres rozliczeniowy w zależności od strefy serwera — a raz
 * w roku, przy zmianie czasu, jeden dzień miałby 23 albo 25 godzin i podział
 * proporcjonalny wyszedłby o dzień obok.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Najpóźniejszy dopuszczalny dzień naliczania — luty nie ma 29–31. */
export const MAX_BILLING_DAY = 28;

export function clampBillingDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(MAX_BILLING_DAY, Math.max(1, Math.trunc(day)));
}

const utcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day));

/** Liczba dni w miesiącu (month liczony od 0). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

const startOfDay = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export type BillingLease = {
  startDate: Date;
  endDate: Date | null;
  rentGrosze: number;
  utilitiesMode: UtilitiesMode;
  utilitiesAdvanceGrosze: number;
  billingDay: number;
  paymentTermDays: number;
};

export type BillingPeriod = {
  periodStart: Date;
  periodEnd: Date;
  issueDate: Date;
  /** Data sprzedaży w rozumieniu FA(2) — ostatni dzień okresu usługi. */
  saleDate: Date;
  dueDate: Date;
  /** Ile dni okresu obejmuje umowa. */
  coveredDays: number;
  /** Ile dni ma cały miesiąc. */
  totalDays: number;
};

/**
 * Wyznacza okres rozliczeniowy umowy dla danego miesiąca.
 *
 * Zwraca `null`, gdy umowa nie obowiązuje w tym miesiącu ani przez jeden dzień —
 * wołający po prostu nie wystawia wtedy faktury.
 */
export function buildBillingPeriod(
  lease: BillingLease,
  year: number,
  /** Miesiąc liczony od 0, jak w Date. */
  month: number,
): BillingPeriod | null {
  const totalDays = daysInMonth(year, month);
  const monthStart = utcDate(year, month, 1);
  const monthEnd = utcDate(year, month, totalDays);

  // Część miesiąca faktycznie objęta umową.
  const periodStartMs = Math.max(startOfDay(monthStart), startOfDay(lease.startDate));
  const periodEndMs = lease.endDate
    ? Math.min(startOfDay(monthEnd), startOfDay(lease.endDate))
    : startOfDay(monthEnd);

  if (periodEndMs < periodStartMs) return null;

  const coveredDays = Math.round((periodEndMs - periodStartMs) / DAY_MS) + 1;

  /*
    Dokumentu nie da się wystawić, zanim okres, którego dotyczy, w ogóle się
    zacznie. Umowa od 17. z dniem naliczania 1. dawała wcześniej datę
    wystawienia 1. — czyli szesnaście dni przed powstaniem umowy — i termin
    płatności jeszcze wcześniejszy niż pierwszy dzień najmu.

    Dlatego bierzemy późniejszą z dwóch dat: dnia naliczania i początku okresu.
    W pierwszym, niepełnym miesiącu wygrywa data zawarcia umowy; w każdym
    kolejnym dzień naliczania, bo okres zaczyna się wtedy pierwszego.
  */
  const billingDate = utcDate(year, month, clampBillingDay(lease.billingDay));
  const issueDate = new Date(Math.max(startOfDay(billingDate), periodStartMs));
  const dueDate = new Date(startOfDay(issueDate) + lease.paymentTermDays * DAY_MS);

  return {
    periodStart: new Date(periodStartMs),
    periodEnd: new Date(periodEndMs),
    issueDate,
    saleDate: new Date(periodEndMs),
    dueDate,
    coveredDays,
    totalDays,
  };
}

/**
 * Czy okres w ogóle podlega naliczeniu.
 *
 * `billingStartsAt` na umowie odcina wszystko, co poprzedni program już
 * rozliczył — patrz komentarz przy polu w schemacie. Odcinamy całymi okresami,
 * a nie dniami: dokument obejmujący choć jeden dzień sprzed przejęcia rozliczeń
 * dublowałby dokument z tamtego systemu, a proporcja liczona od środka miesiąca
 * dawałaby najemcy dwa różne rachunki za ten sam luty.
 *
 * Data wcześniejsza niż początek umowy niczego nie zmienia — wtedy po prostu
 * nie ma czego odcinać.
 */
export function shouldBillPeriod(
  period: BillingPeriod,
  billingStartsAt: Date | null | undefined,
): boolean {
  if (!billingStartsAt) return true;
  return startOfDay(period.periodStart) >= startOfDay(billingStartsAt);
}

/**
 * Czynsz proporcjonalny do liczby dni objętych umową.
 *
 * Dzielimy przez liczbę dni *danego* miesiąca, a nie przez 30: najemca
 * wprowadzający się 15 lutego zapłaciłby inaczej niż 15 marca, mimo że w obu
 * przypadkach mieszka „od połowy miesiąca".
 */
export function prorateRent(rentGrosze: number, period: BillingPeriod): number {
  if (period.coveredDays >= period.totalDays) return rentGrosze;
  return roundHalf((rentGrosze * period.coveredDays) / period.totalDays);
}

const MONTH_NAMES = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

/** "sierpień 2026" — na pozycję faktury. */
export function periodLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export type BillingLinesOptions = {
  /** Stawka dla czynszu. Najem mieszkaniowy jest zwolniony z VAT. */
  rentVatRate?: VatRate;
  utilitiesVatRate?: VatRate;
};

/**
 * Buduje pozycje faktury czynszowej: czynsz plus — zależnie od trybu rozliczeń —
 * zaliczka na media.
 *
 * Tryb METERED nie generuje tu nic poza czynszem: pozycje za media powstają
 * z odczytów liczników, których w tym momencie jeszcze nie ma.
 */
export function buildRentInvoiceLines(
  lease: BillingLease,
  period: BillingPeriod,
  year: number,
  month: number,
  options: BillingLinesOptions = {},
): InvoiceLineInput[] {
  const { rentVatRate = "ZW", utilitiesVatRate = "ZW" } = options;
  const label = periodLabel(year, month);
  const prorated = period.coveredDays < period.totalDays;

  const lines: InvoiceLineInput[] = [
    {
      description: prorated
        ? `Czynsz najmu — ${label} (${period.coveredDays}/${period.totalDays} dni)`
        : `Czynsz najmu — ${label}`,
      quantityMilli: 1000,
      unit: "mies.",
      unitPriceNetGrosze: prorateRent(lease.rentGrosze, period),
      vatRate: rentVatRate,
    },
  ];

  const chargesUtilities =
    lease.utilitiesMode === "FLAT_RATE" || lease.utilitiesMode === "MIXED";

  if (chargesUtilities && lease.utilitiesAdvanceGrosze > 0) {
    lines.push({
      description: prorated
        ? `Zaliczka na media — ${label} (${period.coveredDays}/${period.totalDays} dni)`
        : `Zaliczka na media — ${label}`,
      quantityMilli: 1000,
      unit: "mies.",
      unitPriceNetGrosze: prorateRent(lease.utilitiesAdvanceGrosze, period),
      vatRate: utilitiesVatRate,
    });
  }

  return lines;
}

import type { BillingPeriod } from "@/lib/leases/billing";

/**
 * Szkice dokumentów czynszowych.
 *
 * Czynsz za pełny miesiąc to kwota z umowy — naliczanie wystawia go od razu.
 * Niepełny miesiąc (wprowadzka w połowie, umowa kończąca się 5.) to już
 * wyliczenie: proporcja dni, a do tego zwykle coś do dogadania — mniejsza
 * zaliczka na media, rozliczenie kaucji, dopłata za sprzątanie. Takiego
 * dokumentu nie wysyłamy najemcy w ciemno: powstaje jako szkic, właściciel
 * poprawia pozycje i dopiero wtedy go zatwierdza.
 *
 * Szkic nie ma numeru z rejestru. Kolumna `number` jest jednak wymagana
 * i unikalna, więc szkic nosi numer zastępczy z prefiksem poniżej. Numer
 * zastępczy nie zajmuje miejsca w rejestrze (`nextInvoiceNumber` pomija
 * szkice), a prawdziwy dostaje dopiero przy zatwierdzeniu — z datą
 * wystawienia, którą właściciel mógł w międzyczasie zmienić.
 */

export const DRAFT_NUMBER_PREFIX = "szkic-";

/**
 * Numer zastępczy szkicu — unikalny, więc nie zderzy się z `@@unique`.
 */
export function draftInvoiceNumber(): string {
  return `${DRAFT_NUMBER_PREFIX}${globalThis.crypto.randomUUID()}`;
}

/** Czy naliczony okres wymaga akceptacji właściciela przed wystawieniem. */
export function requiresApproval(period: Pick<BillingPeriod, "coveredDays" | "totalDays">): boolean {
  return period.coveredDays < period.totalDays;
}

/**
 * Czy dokument ma numer z rejestru. Szkic — także odrzucony, czyli anulowany —
 * nosi numer zastępczy, którego nie pokazujemy: „szkic-9f1c…" nic nie mówi.
 */
export function hasRegisterNumber(number: string): boolean {
  return !number.startsWith(DRAFT_NUMBER_PREFIX);
}

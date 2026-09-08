import type { InvoiceStatus } from "@/generated/prisma/enums";

/**
 * Poprawianie numeru wystawionego dokumentu.
 *
 * Normalnie numer nadaje się raz i zostaje — na tym polega rejestr. Ten plik
 * opisuje wyjątek zrobiony dla kont, które w dniu wdrożenia miały w Rentiksie
 * dokumenty jeszcze nierozliczone z księgowością: dopóki numer nie trafił do
 * ksiąg, jego poprawienie jest korektą wpisu, a nie fałszowaniem dokumentu.
 *
 * Wyjątek jest zamknięty z dwóch stron naraz i obie strony są konieczne:
 *
 * 1. KONTO. Lista z `INVOICE_NUMBER_EDIT_ORGS` (slugi albo identyfikatory
 *    organizacji). Pozostałe konta nie widzą tej funkcji i nie przejdzie im
 *    żądanie do API.
 *
 * 2. DATA. `RENUMBER_CUTOFF` — dokumenty wystawione od tej chwili mają numer
 *    nienaruszalny, bez względu na konto. Dzięki temu furtka nie zostaje
 *    otwarta na zawsze: zamyka się sama, gdy bieżący zeszyt się skończy.
 *
 * Ten plik nie dotyka Prismy ani `env` — czyta go i test, i strona panelu.
 * Odczyt konta z bazy siedzi w `service.ts` (`mayRenumberInvoices`).
 */

/**
 * Granica między „stare, jeszcze nierozliczone" a „wystawione na nowych
 * zasadach". Liczona po `createdAt`, a nie po dacie wystawienia: datę
 * wystawienia wpisuje użytkownik i mógłby wsteczną datą wprowadzić nowy
 * dokument do puli edytowalnych.
 */
export const RENUMBER_CUTOFF = new Date("2026-09-09T00:00:00.000Z");

/** `INVOICE_NUMBER_EDIT_ORGS` → lista wpisów gotowa do porównania. */
export function parseOrganizationAllowlist(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== "");
}

/**
 * Czy konto jest na liście.
 *
 * Wpis pasuje do sluga albo do identyfikatora, bo slug powstaje z nazwy
 * („Miret sp. z o.o." → `miret-sp-z-o-o`) i nie zawsze jest tym, czego ktoś
 * się spodziewa. Identyfikator działa wtedy jako zapis pewny.
 */
export function organizationInAllowlist(
  organization: { id: string; slug: string },
  allowlist: readonly string[],
): boolean {
  return (
    allowlist.includes(organization.id.toLowerCase()) ||
    allowlist.includes(organization.slug.toLowerCase())
  );
}

/**
 * Czy numer tego dokumentu wolno jeszcze poprawić.
 *
 * Anulowany zostaje poza wyjątkiem: jego numer jest w rejestrze zaparkowany
 * właśnie po to, żeby nie powstała dziura — przepisanie go zrobiłoby dokładnie
 * tę dziurę, przed którą broni `cancelInvoice`.
 */
export function invoiceNumberEditable(
  invoice: { createdAt: Date; status: InvoiceStatus },
  cutoff: Date = RENUMBER_CUTOFF,
): boolean {
  if (invoice.status === "CANCELLED") return false;
  return invoice.createdAt.getTime() < cutoff.getTime();
}

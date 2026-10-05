import type { InvoiceStatus } from "@/generated/prisma/enums";

/**
 * Poprawianie numeru dokumentu.
 *
 * Normalnie numer nadaje się raz i zostaje — na tym polega rejestr. Ten plik
 * opisuje wyjątek dla kont, które numerację prowadzą równolegle gdzie indziej
 * (np. w Fakturowni) i muszą dopasować numer z Rentiksa do tamtego zeszytu,
 * bo inaczej ten sam numer trafiłby do ksiąg dwa razy.
 *
 * Furtka jest zamknięta na poziomie KONTA: lista z `INVOICE_NUMBER_EDIT_ORGS`
 * (slugi albo identyfikatory organizacji). Pozostałe konta nie widzą tej
 * funkcji i nie przejdzie im żądanie do API. Na koncie z listy numer da się
 * poprawić w każdym nieanulowanym dokumencie, a w szkicu wpisać przed
 * zatwierdzeniem zamiast numeru z licznika.
 *
 * Ten plik nie dotyka Prismy ani `env` — czyta go i test, i strona panelu.
 * Odczyt konta z bazy siedzi w `service.ts` (`mayRenumberInvoices`).
 */

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
 * Wpis pasuje na trzy sposoby, bo slug powstaje z nazwy podanej przy
 * rejestracji i nie zawsze jest tym, czego ktoś się spodziewa — „Miret
 * sp. z o.o." daje `miret-sp-z-o-o`, samo „Miret" daje `miret`, a drugie
 * konto o tej samej nazwie `miret-2`:
 *
 * 1. identyfikator organizacji — zapis pewny, gdy trzeba wskazać dokładnie
 *    jedno konto;
 * 2. slug wprost;
 * 3. slug zaczynający się od wpisu i myślnika, czyli ta sama nazwa z dopiskiem
 *    formy prawnej albo z licznikiem.
 *
 * Myślnik w trzecim warunku jest istotny: bez niego wpis „miret" objąłby też
 * konto „Miretex", czyli zupełnie kogoś innego.
 */
export function organizationInAllowlist(
  organization: { id: string; slug: string },
  allowlist: readonly string[],
): boolean {
  const id = organization.id.toLowerCase();
  const slug = organization.slug.toLowerCase();

  return allowlist.some(
    (entry) => entry === id || entry === slug || slug.startsWith(`${entry}-`),
  );
}

/**
 * Czy numer tego dokumentu wolno jeszcze poprawić.
 *
 * Anulowany zostaje poza wyjątkiem: jego numer jest w rejestrze zaparkowany
 * właśnie po to, żeby nie powstała dziura — przepisanie go zrobiłoby dokładnie
 * tę dziurę, przed którą broni `cancelInvoice`.
 */
export function invoiceNumberEditable(invoice: { status: InvoiceStatus }): boolean {
  return invoice.status !== "CANCELLED";
}

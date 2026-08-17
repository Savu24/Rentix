/**
 * Reguła kompletności danych wystawcy — bez dostępu do bazy.
 *
 * Wydzielona z serwisu, jak reguły w `src/lib/invoices/rules.ts`: to decyzja,
 * którą trzeba umieć sprawdzić testem, a import klienta Prismy ciągnąłby za
 * sobą całą konfigurację środowiska.
 */

/** Pola, których brak psuje dokument sprzedaży. */
export type SellerData = {
  name: string;
  taxId: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
};

/**
 * Czy dane sprzedawcy wystarczą na rachunek.
 *
 * Rachunek bez adresu wystawcy jest dokumentem niepełnym, a system pozwala go
 * wystawić — organizacja powstaje przy rejestracji z samą nazwą. Zamiast
 * blokować wystawianie, sprawdzamy komplet i przypominamy w panelu: właściciel
 * ma zobaczyć problem, zanim wyśle PDF najemcy, a nie zamiast wystawić.
 *
 * NIP jest poza warunkiem: osoba fizyczna wynajmująca prywatnie go nie ma,
 * a wymaganie go oznaczałoby ostrzeżenie, którego nie da się wyłączyć.
 */
export function isSellerComplete(seller: SellerData): boolean {
  return Boolean(seller.street?.trim() && seller.postalCode?.trim() && seller.city?.trim());
}

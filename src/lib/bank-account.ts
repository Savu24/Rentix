import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Numer rachunku w zapisie do czytania.
 *
 * W bazie leży znormalizowany — same cyfry, bez prefiksu i spacji. Człowiek
 * przepisuje go do przelewu wzrokiem, a ciąg cyfr bez przerw czyta się o rząd
 * wielkości gorzej niż grupy.
 *
 * Rachunki obu krajów mieszczą się w jednej kolumnie, bo w obu są to same
 * cyfry — różni się długość i sposób grupowania:
 *
 * • Polska: 26 cyfr (IBAN bez prefiksu „PL"), grupy 2 + 4 + 4 + …
 * • Wielka Brytania: 14 cyfr, czyli sort code (6) i numer konta (8). Brytyjczyk
 *   podaje je jako dwie osobne wartości i tak też muszą wyglądać na dokumencie —
 *   „12-34-56 12345678", a nie jeden ciąg. Zlepienie ich w IBAN byłoby dla
 *   najemcy nieczytelne, a dla przelewu bezużyteczne.
 *
 * Osobny moduł, nie funkcja przy schemacie walidacji: korzysta z niego także
 * renderer PDF-a, który z formularzami nie ma nic wspólnego.
 */

/** Ile cyfr ma znormalizowany rachunek w danym kraju. */
export const BANK_ACCOUNT_DIGITS: Record<Locale, number> = {
  pl: 26,
  uk: 14,
};

export function formatBankAccount(
  account: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const digits = account.replace(/\s/g, "");

  // Nietypową długość zostawiamy tak, jak przyszła — dane sprzed walidacji
  // albo rachunek zagraniczny lepiej pokazać w całości niż pociąć na siłę.
  if (digits.length !== BANK_ACCOUNT_DIGITS[locale]) return account;

  if (locale === "uk") {
    // „12-34-56 12345678" — sort code z myślnikami, numer konta jednym ciągiem.
    const sortCode = digits.slice(0, 6).replace(/(\d{2})(?=\d)/g, "$1-");
    return `${sortCode} ${digits.slice(6)}`;
  }

  // „12 3456 7890 1234 5678 9012 3456", jak na przelewie.
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`.trim();
}

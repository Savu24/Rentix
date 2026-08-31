/**
 * Numer rachunku w zapisie do czytania.
 *
 * W bazie leży znormalizowany — same cyfry, bez prefiksu i spacji. Człowiek
 * przepisuje go do przelewu wzrokiem, a ciąg dwudziestu sześciu cyfr bez
 * przerw czyta się o rząd wielkości gorzej niż grupy po cztery.
 *
 * Osobny moduł, nie funkcja przy schemacie walidacji: korzysta z niego także
 * renderer PDF-a, który z formularzami nie ma nic wspólnego.
 */

/** 26 cyfr → „12 3456 7890 1234 5678 9012 3456", jak na przelewie. */
export function formatBankAccount(account: string): string {
  const digits = account.replace(/\s/g, "");
  // Nietypowa długość zostawiamy tak, jak przyszła — dane sprzed walidacji
  // albo rachunek zagraniczny lepiej pokazać w całości niż pociąć na siłę.
  if (digits.length !== 26) return account;
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`.trim();
}

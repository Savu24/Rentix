import type { InvoiceKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

/**
 * Numeracja dokumentów.
 *
 * Format „FV 3/08/2026" — kolejny numer w miesiącu, miesiąc, rok. To zapis,
 * którego oczekuje polskie biuro rachunkowe; numeracja resetuje się co miesiąc
 * i biegnie osobno dla każdego rodzaju dokumentu, bo rachunek i faktura VAT
 * to dwa odrębne rejestry.
 *
 * Sam układ zostaje w wersji brytyjskiej, bo miesięczna seria czyta się tak
 * samo dobrze; zmienia się prefiks, żeby „R" i „FV" nie wyglądały jak literówka
 * na dokumencie po angielsku. Prefiksy siedzą w słowniku pod
 * `documents.numberPrefix`.
 *
 * Numer anulowanego dokumentu zostaje zajęty — rejestr ma być ciągły, a dziura
 * po numerze jest dla księgowego sygnałem, że coś zniknęło bez śladu.
 *
 * Numer nadaje się raz, przy wystawieniu, i zostaje w bazie — zmiana prefiksów
 * nie rusza dokumentów już wystawionych.
 */

export function invoiceNumberPrefixes(locale: Locale): Record<InvoiceKind, string> {
  return getDictionary(locale).documents.numberPrefix;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatInvoiceNumber(
  kind: InvoiceKind,
  sequence: number,
  year: number,
  /** Miesiąc liczony od zera, jak w `Date`. */
  month: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${invoiceNumberPrefixes(locale)[kind]} ${sequence}/${pad(month + 1)}/${year}`;
}

/**
 * Kolejny wolny numer dla organizacji, rodzaju i miesiąca wystawienia.
 *
 * Liczy dokumenty już wystawione w tym miesiącu zamiast trzymać licznik
 * w osobnej tabeli — przy skali jednego właściciela to kilkanaście rekordów
 * miesięcznie, a licznik wymagałby własnej obsługi transakcji i i tak
 * rozjechałby się po ręcznej korekcie w bazie.
 *
 * Wyścig dwóch równoległych wystawień kończy się naruszeniem `@@unique`
 * na (organizationId, number) — wołający ponawia próbę, patrz
 * `withUniqueNumberRetry`.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  kind: InvoiceKind,
  issueDate: Date,
): Promise<string> {
  const year = issueDate.getUTCFullYear();
  const month = issueDate.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1));
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1));

  /*
    Prefiks bierze się z kraju wystawcy, więc musimy go znać przed nadaniem
    numeru. Zapytanie jest w tej samej transakcji co reszta wystawienia.
  */
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { locale: true },
  });
  const locale = isLocale(organization?.locale) ? organization.locale : DEFAULT_LOCALE;

  const used = await tx.invoice.count({
    where: {
      organizationId,
      kind,
      // Szkice nie mają jeszcze numeru, więc nie zajmują miejsca w rejestrze.
      status: { not: "DRAFT" },
      issueDate: { gte: monthStart, lt: nextMonthStart },
    },
  });

  return formatInvoiceNumber(kind, used + 1, year, month, locale);
}

/** Prisma sygnalizuje naruszenie unikalności kodem P2002. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Ponawia operację, gdy dwa wystawienia trafiły na ten sam numer.
 *
 * Kolizja jest rzadka (wymaga dwóch żądań w tej samej milisekundzie), więc
 * zwykłe ponowienie jest tańsze niż blokada na poziomie tabeli, która
 * serializowałaby całe naliczanie miesięczne.
 */
export async function withUniqueNumberRetry<T>(
  operation: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }

  throw lastError;
}

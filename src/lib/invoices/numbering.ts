import type { InvoiceKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

import {
  DEFAULT_NUMBER_FORMAT,
  numberingPeriodBounds,
  renderNumberFormat,
  sequenceInNumber,
} from "./number-format";

/**
 * Numeracja dokumentów.
 *
 * Domyślnie „R 3/08/2026" — kolejny numer w miesiącu, miesiąc, rok. To zapis,
 * którego oczekuje polskie biuro rachunkowe; numeracja resetuje się co miesiąc
 * i biegnie osobno dla każdego rodzaju dokumentu, bo rachunek i faktura VAT
 * to dwa odrębne rejestry.
 *
 * Układ cyfr wybiera organizacja w ustawieniach — gotowe wzory albo własny,
 * patrz `number-format.ts`. Ten sam wzór mówi, co ile licznik wraca do
 * jedynki: co miesiąc, co rok albo nigdy. Litery serii NIE są częścią wzoru:
 * to one rozdzielają rejestry, więc doklejamy je zawsze, z przodu.
 *
 * Prefiks zmienia się z wersją krajową, żeby litery serii nie wyglądały jak
 * literówka na dokumencie po angielsku. Prefiksy siedzą w słowniku pod
 * `documents.numberPrefix`.
 *
 * Seria bywa pusta — polska faktura ma sam numer, bo „Faktura" stoi nad nim
 * w nagłówku i „FV" mówiłoby to samo drugi raz. Pusta może być dokładnie jedna
 * seria w danym kraju: rejestry biegną osobno, więc druga pusta oznaczałaby
 * dwa dokumenty tego samego miesiąca pod jednym numerem.
 *
 * Numer anulowanego dokumentu zostaje zajęty — rejestr ma być ciągły, a dziura
 * po numerze jest dla księgowego sygnałem, że coś zniknęło bez śladu.
 *
 * Numer nadaje się raz, przy wystawieniu, i zostaje w bazie — zmiana prefiksów
 * ani wzoru nie rusza dokumentów już wystawionych. Jedyny wyjątek opisuje
 * `renumber.ts`.
 */

export function invoiceNumberPrefixes(locale: Locale): Record<InvoiceKind, string> {
  return getDictionary(locale).documents.numberPrefix;
}

export function formatInvoiceNumber(
  kind: InvoiceKind,
  sequence: number,
  issueDate: Date,
  locale: Locale = DEFAULT_LOCALE,
  template: string = DEFAULT_NUMBER_FORMAT,
): string {
  const prefix = invoiceNumberPrefixes(locale)[kind];
  const core = renderNumberFormat(template, sequence, issueDate);

  // Pusta seria (polska faktura) daje sam numer — bez niej zostawałaby spacja
  // wiodąca, która wchodziłaby do bazy, do nazwy pliku i do wyszukiwarki.
  return prefix === "" ? core : `${prefix} ${core}`;
}

/**
 * Kolejny wolny numer dla organizacji, rodzaju i okresu wystawienia — miesiąca,
 * roku albo całego rejestru, zależnie od wzoru numeru.
 *
 * Liczy z dokumentów już wystawionych w tym okresie zamiast trzymać licznik
 * w osobnej tabeli — przy skali jednego właściciela to kilkanaście rekordów
 * miesięcznie, a licznik wymagałby własnej obsługi transakcji i i tak
 * rozjechałby się po ręcznej korekcie w bazie.
 *
 * Bierze największy numer porządkowy, a nie samą liczbę dokumentów. Różnica
 * wychodzi dopiero, gdy ktoś poprawi numer ręcznie (`renumber.ts`): trzy
 * dokumenty przenumerowane na 1, 2 i 4 dałyby przy liczeniu sztuk numer 4,
 * czyli kolizję, której nie rozwiąże żadne ponowienie — bo licznik wracałby
 * z tą samą wartością.
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
  /*
    Prefiks bierze się z kraju wystawcy, a układ cyfr z ustawień, więc oba
    musimy znać przed nadaniem numeru. Zapytanie jest w tej samej transakcji
    co reszta wystawienia.
  */
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { locale: true, invoiceNumberFormat: true },
  });
  const locale = isLocale(organization?.locale) ? organization.locale : DEFAULT_LOCALE;
  const template = organization?.invoiceNumberFormat ?? DEFAULT_NUMBER_FORMAT;

  const bounds = numberingPeriodBounds(template, issueDate);

  const used = await tx.invoice.findMany({
    where: {
      organizationId,
      kind,
      // Szkice nie mają jeszcze numeru, więc nie zajmują miejsca w rejestrze.
      status: { not: "DRAFT" },
      ...(bounds.gte ? { issueDate: bounds } : {}),
    },
    select: { number: true },
  });

  /*
    Liczba dokumentów zostaje dolną granicą: numer poprawiony ręcznie na zapis
    spoza formatu („12/2026 KOR") albo nadany przed zmianą wzoru w ustawieniach
    nie da się odczytać, a mimo to zajmuje miejsce w okresie i nie może
    zwolnić numeru wydanego wcześniej.
  */
  const highest = used.reduce(
    (max, invoice) => Math.max(max, sequenceInNumber(invoice.number, template, issueDate) ?? 0),
    used.length,
  );

  return formatInvoiceNumber(kind, highest + 1, issueDate, locale, template);
}

/** Prisma sygnalizuje naruszenie unikalności kodem P2002. */
export function isUniqueViolation(error: unknown): boolean {
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

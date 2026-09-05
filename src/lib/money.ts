import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Arytmetyka pieniędzy w najmniejszej jednostce waluty.
 *
 * Wszystkie kwoty w Rentiksie to liczby całkowite groszy — nigdy Float.
 * Powód jest prozaiczny: 0.1 + 0.2 !== 0.3 w IEEE 754, a po tysiącu faktur
 * saldo rozjeżdża się o grosze, których nikt potem nie znajdzie.
 *
 * Wersja brytyjska liczy w pensach. Nazwa „grosze" w kodzie zostaje, bo tak
 * nazywają się kolumny w bazie, a i złoty, i funt dzielą się na sto — arytmetyka
 * jest ta sama, zmienia się wyłącznie formatowanie.
 *
 * Ten moduł jest jedynym miejscem, w którym wolno zaokrąglać.
 */

/*
  Formatery są drogie w tworzeniu, a wołamy je w pętli po każdym wierszu listy
  faktur — stąd jeden komplet na wersję krajową, budowany raz.

  `useGrouping: "always"`, bo CLDR dla polskiego nie grupuje liczb
  czterocyfrowych („2400,00 zł", ale „18 400,00 zł"). W kolumnie faktur wygląda
  to na literówkę; kwoty mają się czytać jednakowo w każdym wierszu.
*/
const currencyFormatters = new Map<Locale, Intl.NumberFormat>();
const amountFormatters = new Map<Locale, Intl.NumberFormat>();

function currencyFormatter(locale: Locale): Intl.NumberFormat {
  let formatter = currencyFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_META[locale].intl, {
      style: "currency",
      currency: LOCALE_META[locale].currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: "always",
    });
    currencyFormatters.set(locale, formatter);
  }
  return formatter;
}

function amountFormatter(locale: Locale): Intl.NumberFormat {
  let formatter = amountFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_META[locale].intl, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: "always",
    });
    amountFormatters.set(locale, formatter);
  }
  return formatter;
}

/** 240000 → „2 400,00 zł" (pl) albo „£2,400.00" (uk). */
export function formatMoney(grosze: number, locale: Locale = DEFAULT_LOCALE): string {
  return currencyFormatter(locale).format(grosze / 100);
}

/** 240000 → „2 400,00" / „2,400.00" — bez symbolu, do pól formularza i CSV. */
export function formatAmount(grosze: number, locale: Locale = DEFAULT_LOCALE): string {
  return amountFormatter(locale).format(grosze / 100);
}

/**
 * Zapis kwoty bez symbolu waluty, ale z jej nazwą — do dokumentów, gdzie
 * „£" po lewej wygląda źle w kolumnie, a sama liczba nie mówi, w czym jest.
 */
export function formatAmountWithCode(
  grosze: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${formatAmount(grosze, locale)} ${LOCALE_META[locale].currency}`;
}

/** 240000 → „2 400,00 zł". Zostaje pod starą nazwą dla polskich wywołań. */
export function formatPLN(grosze: number): string {
  return formatMoney(grosze, "pl");
}

/**
 * Parsuje kwotę wpisaną przez człowieka na grosze.
 *
 * ⚠️ Separatory są w obu krajach **odwrotne**: „1.234,56" to po polsku tysiąc
 * dwieście, a po brytyjsku jeden i dwie dziesiąte. Dlatego parser dostaje
 * wersję krajową, zamiast zgadywać po znaku — pomyłka tutaj to trzy rzędy
 * wielkości na fakturze.
 *
 * Przyjmuje zapis lokalny („2 400,50" / „2,400.50"), spacje nierozdzielające
 * wklejone z arkusza i symbol waluty. Zwraca `null`, gdy wejście nie jest
 * kwotą — wołający decyduje, co z tym zrobić.
 */
export function parseMoney(input: string, locale: Locale = DEFAULT_LOCALE): number | null {
  if (typeof input !== "string") return null;

  let cleaned = input
    .replace(/\s/g, "") // spacje, w tym nierozdzielające z arkuszy
    .replace(/^[£€$]/, "")
    .replace(/z[łl]$/i, "")
    .replace(/PLN$/i, "")
    .replace(/GBP$/i, "");

  if (locale === "pl") {
    // Kropka w polskim zapisie bywa separatorem tysięcy („1.234,56"), ale bywa
    // też przecinkiem dziesiętnym wklejonym z arkusza po angielsku („1234.56").
    // Rozstrzyga obecność przecinka: gdy jest, kropka jest tysiącami.
    if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "");
    cleaned = cleaned.replace(",", ".");
  } else {
    // Po brytyjsku przecinek jest wyłącznie separatorem tysięcy.
    cleaned = cleaned.replace(/,/g, "");
  }

  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;

  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  // Więcej niż dwa miejsca po przecinku to nie kwota, tylko pomyłka.
  if (parts[1] !== undefined && parts[1].length > 2) return null;

  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = cleaned.replace("-", "").split(".");
  const grosze = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isFinite(grosze)) return null;
  return negative ? -grosze : grosze;
}

/** Parsowanie polskiego zapisu. Zostaje pod starą nazwą dla polskich wywołań. */
export function parsePLN(input: string): number | null {
  return parseMoney(input, "pl");
}

/**
 * Zaokrąglenie handlowe: połówki od zera.
 *
 * `Math.round` zaokrągla połówki ku +∞, więc -0,5 daje -0 zamiast -1.
 * Przy korektach i notach ujemnych to dawałoby grosz różnicy w złą stronę.
 */
export function roundHalf(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Mnoży kwotę jednostkową przez ilość podaną w tysięcznych.
 *
 * Ilość na fakturze ma trzy miejsca po przecinku (4,235 m³ wody), więc
 * przekazujemy ją jako liczbę całkowitą tysięcznych — 4235 — żeby mnożenie
 * odbyło się na liczbach całkowitych, a zaokrąglenie nastąpiło raz, na końcu.
 */
export function multiplyByQuantity(unitPriceGrosze: number, quantityMilli: number): number {
  return roundHalf((unitPriceGrosze * quantityMilli) / 1000);
}

/** Zamienia ilość "4.235" albo 4.235 na tysięczne (4235). */
export function toQuantityMilli(quantity: number | string): number {
  const value = typeof quantity === "string" ? Number(quantity.replace(",", ".")) : quantity;
  if (!Number.isFinite(value)) throw new Error(`Nieprawidłowa ilość: ${quantity}`);
  return roundHalf(value * 1000);
}

export function sumGrosze(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Dzieli kwotę na `parts` części tak, żeby suma części równała się dokładnie
 * kwocie wejściowej. Reszta z dzielenia rozchodzi się po jednym groszu
 * na pierwsze części — bez tego podział 100,00 zł na 3 dałby 99,99 zł.
 *
 * Potrzebne przy dzieleniu opłat wspólnych między najemców.
 */
export function splitGrosze(total: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`Liczba części musi być dodatnią liczbą całkowitą, otrzymano ${parts}`);
  }
  const sign = total < 0 ? -1 : 1;
  const absolute = Math.abs(total);
  const base = Math.floor(absolute / parts);
  const remainder = absolute - base * parts;

  return Array.from({ length: parts }, (_, index) =>
    sign * (base + (index < remainder ? 1 : 0)),
  );
}

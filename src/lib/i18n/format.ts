import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./config";

/**
 * Formatowanie zależne od wersji krajowej: daty, liczby, odmiana przez liczbę.
 * Kwoty mają własny moduł (`@/lib/money`), bo tam obok formatowania siedzi
 * arytmetyka i zaokrąglanie.
 */

type DateStyle = "long" | "short" | "numeric" | "monthYear";

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  /** „5 września 2026" / „5 September 2026" */
  long: { day: "numeric", month: "long", year: "numeric" },
  /** „5 wrz 2026" / „5 Sep 2026" */
  short: { day: "numeric", month: "short", year: "numeric" },
  /** „05.09.2026" / „05/09/2026" — obie wersje mają dzień przed miesiącem. */
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
  /** „wrzesień 2026" / „September 2026" */
  monthYear: { month: "long", year: "numeric" },
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(locale: Locale, style: DateStyle): Intl.DateTimeFormat {
  const key = `${locale}:${style}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE_META[locale].intl, DATE_OPTIONS[style]);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatDateIn(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE,
  style: DateStyle = "long",
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return dateFormatter(locale, style).format(value);
}

/**
 * Odmiana rzeczownika przez liczbę.
 *
 * Polski ma trzy formy (pokój / pokoje / pokoi), angielski dwie (room / rooms),
 * więc słownik podaje tyle wariantów, ile jego język wymaga — a wybór między
 * nimi robi `Intl.PluralRules`, zamiast ręcznych warunków na resztach z dzielenia.
 *
 *   pluralize("pl", 4, ["pokój", "pokoje", "pokoi"])  → "pokoje"
 *   pluralize("uk", 4, ["room", "rooms"])             → "rooms"
 */
const pluralRules = new Map<Locale, Intl.PluralRules>();

/** Kolejność wariantów w słowniku — po jednym wpisie na kategorię CLDR. */
const PLURAL_ORDER: Record<Locale, readonly Intl.LDMLPluralRule[]> = {
  pl: ["one", "few", "many"],
  uk: ["one", "other"],
};

export function pluralize(
  locale: Locale,
  count: number,
  forms: readonly string[],
): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALE_META[locale].intl);
    pluralRules.set(locale, rules);
  }

  const category = rules.select(Math.abs(count));
  const index = PLURAL_ORDER[locale].indexOf(category);

  // `other` w polskim to ułamki („1,5 pokoju") — kategoria, której słowniki nie
  // opisują, bo w Rentiksie liczymy rzeczy całe. Ostatni wariant jest wtedy
  // najbezpieczniejszy: to dopełniacz liczby mnogiej.
  return forms[index === -1 ? forms.length - 1 : Math.min(index, forms.length - 1)] ?? "";
}

/**
 * Wstawia wartości w miejsca `{nazwa}` w tekście ze słownika.
 *
 * Świadomie bez ICU: słowniki muszą dać się przesłać z serwera do komponentu
 * klienckiego, a funkcji nie da się zserializować. Wszystko, co zmienne,
 * jest więc zwykłym stringiem z dziurami.
 */
export function fill(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Liczba porządkowa/zwykła w zapisie lokalnym: 1234 → „1234" / „1,234". */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl).format(value);
}

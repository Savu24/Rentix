import { type Locale } from "./config";
import { pl } from "./dictionaries/pl";
import { uk } from "./dictionaries/uk";
import type { Dictionary } from "./types";

export * from "./config";
export * from "./format";
export type { Dictionary } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { pl, uk };

/**
 * Teksty dla danej wersji krajowej.
 *
 * Synchronicznie i bez dynamicznego importu: oba słowniki to zwykłe dane,
 * a strona serwerowa renderuje się w jednym przebiegu. Do komponentu
 * klienckiego trafia wyłącznie słownik aktywnej wersji — przez `I18nProvider`,
 * a nie przez import, żeby przeglądarka nie pobierała obu.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

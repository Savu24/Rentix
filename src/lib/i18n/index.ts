import { type Locale } from "./config";
import { pl } from "./dictionaries/pl";
import { uk } from "./dictionaries/uk";
import type { ClientDictionary, Dictionary } from "./types";

export * from "./config";
export * from "./format";
export type { ClientDictionary, Dictionary } from "./types";

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

/**
 * Słownik okrojony do tego, czego naprawdę używa przeglądarka.
 *
 * Wołany w layoutach, tuż przed `I18nProvider` — to jedyne miejsce, w którym
 * teksty przekraczają granicę serwer–klient.
 */
export function clientDictionary(locale: Locale): ClientDictionary {
  const { common, auth, panel, emails } = getDictionary(locale);
  return { common, auth, panel, emails };
}

/**
 * Kontekst dla schematów walidacji: kraj plus jego teksty.
 *
 * Schematy nie sięgają po słownik same, bo importuje je także przeglądarka —
 * dostają go stąd (serwer) albo z `useI18n()` (klient).
 */
export function localeContext(locale: Locale): { locale: Locale; d: ClientDictionary } {
  return { locale, d: clientDictionary(locale) };
}

"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, type Locale } from "./config";
import { formatDateIn, pluralize } from "./format";
import type { ClientDictionary } from "./types";

/**
 * Teksty dla komponentów klienckich.
 *
 * Słownik wchodzi propsem z komponentu serwerowego, a nie importem — inaczej
 * przeglądarka pobierałaby teksty wszystkich wersji krajowych, żeby pokazać
 * jedną. Dlatego słowniki są czystymi danymi: żadnych funkcji, bo tych nie da
 * się przesłać przez granicę serwer–klient.
 */

type I18nValue = {
  locale: Locale;
  d: ClientDictionary;
  /** Odmiana przez liczbę w bieżącym języku. */
  plural: (count: number, forms: readonly string[]) => string;
  /** Data w zapisie bieżącego kraju. */
  date: (value: Date | string, style?: "long" | "short" | "numeric" | "monthYear") => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: ClientDictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      d: dictionary,
      plural: (count, forms) => pluralize(locale, count, forms),
      date: (input, style = "long") => formatDateIn(input, locale, style),
    }),
    [locale, dictionary],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Rzuca poza providerem — celowo.
 *
 * Cichy powrót do polskiego dawałby stronę, na której połowa napisów jest po
 * angielsku, a połowa po polsku, i nikt by tego nie zauważył przed wdrożeniem.
 * Lepiej, żeby brakujący provider wywalił się od razu na ekranie dewelopera.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n wymaga <I18nProvider> wyżej w drzewie.");
  }
  return value;
}

/** Sam język, gdy komponent potrzebuje tylko formatowania. */
export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? DEFAULT_LOCALE;
}

/**
 * Kontekst dla schematów walidacji po stronie przeglądarki.
 *
 * `useMemo`, bo trafia do `zodResolver` — nowy obiekt przy każdym renderze
 * przebudowywałby resolver formularza i gubił stan pól.
 */
export function useValidationContext(): { locale: Locale; d: ClientDictionary } {
  const { locale, d } = useI18n();
  return useMemo(() => ({ locale, d }), [locale, d]);
}

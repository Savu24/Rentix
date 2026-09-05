"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Maska kodu pocztowego — inna w każdym kraju, bo to inny format danych.
 *
 * Polska: pięć cyfr z myślnikiem po drugiej („30-001"). Maska jest po to, żeby
 * właściciel nie dowiadywał się o myślniku dopiero z błędu przy zapisie.
 *
 * Wielka Brytania: kod jest alfanumeryczny, ma od pięciu do siedmiu znaków
 * i zmienną budowę („M1 1AE", „SW1A 1AA", „DN55 1PT"). Stała pozycja separatora
 * nie istnieje — jedyna reguła to spacja przed trzema ostatnimi znakami. Maska
 * cyfrowa zablokowałaby tu wpisanie czegokolwiek, więc zamiast niej
 * normalizujemy tylko wielkość liter i tę jedną spację.
 */
export function formatPostalCode(value: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "uk") {
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    return compact.length > 4 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
  }

  const digits = value.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

/**
 * Kod pocztowy z separatorem wstawianym w trakcie pisania.
 *
 * Kursor po sformatowaniu ląduje na końcu; przy kilku znakach wpisywanych
 * od lewej to jest dokładnie to miejsce, w którym stał.
 */
export function PostalCodeInput({ onChange, ...props }: React.ComponentProps<"input">) {
  const locale = useLocale();

  return (
    <Input
      // Brytyjski kod ma litery, więc klawiatura numeryczna na telefonie
      // zamykałaby drogę do połowy znaków.
      inputMode={locale === "uk" ? "text" : "numeric"}
      autoComplete="postal-code"
      autoCapitalize={locale === "uk" ? "characters" : undefined}
      maxLength={locale === "uk" ? 8 : 6}
      onChange={(event) => {
        // Podmiana idzie na samym elemencie, bo react-hook-form czyta wartość
        // z eventu — do stanu formularza trafia więc już kod z separatorem.
        event.target.value = formatPostalCode(event.target.value, locale);
        onChange?.(event);
      }}
      {...props}
    />
  );
}

"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

/**
 * „30001" → „30-001". Cyfry ponad pięć odpadają, żeby wpisanie numeru telefonu
 * w złe pole nie rozjechało maski.
 */
export function formatPostalCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

/**
 * Kod pocztowy z myślnikiem wstawianym w trakcie pisania.
 *
 * Walidacja wymaga zapisu 00-000, ale pole samo tego nie zdradza — bez maski
 * właściciel dowiadywał się o myślniku dopiero z błędu przy zapisie
 * formularza. Kursor po sformatowaniu ląduje na końcu; przy pięciu znakach
 * wpisywanych od lewej to jest dokładnie to miejsce, w którym stał.
 */
export function PostalCodeInput({ onChange, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="postal-code"
      maxLength={6}
      onChange={(event) => {
        // Podmiana idzie na samym elemencie, bo react-hook-form czyta wartość
        // z eventu — do stanu formularza trafia więc już kod z myślnikiem.
        event.target.value = formatPostalCode(event.target.value);
        onChange?.(event);
      }}
      {...props}
    />
  );
}

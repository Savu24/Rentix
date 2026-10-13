import { z } from "zod";

import type { Dictionary } from "@/lib/i18n/types";

/**
 * Schematy współdzielone przez formularz (React Hook Form) i API route.
 * Ta sama definicja po obu stronach = komunikaty błędów nie rozjeżdżają się
 * między walidacją w przeglądarce a walidacją na serwerze.
 *
 * Schematy są funkcjami przyjmującymi **teksty**, a nie kod języka — i to jest
 * różnica praktyczna, nie estetyczna. Gdyby brały `locale` i same sięgały po
 * słownik, ten plik importowałby wszystkie słowniki; a że korzysta z niego
 * komponent kliencki, przeglądarka pobierałaby teksty każdej wersji krajowej,
 * żeby wyświetlić jedną. Teksty wchodzą więc z zewnątrz: na serwerze ze
 * `getDictionary(locale)`, w przeglądarce z `useI18n()`.
 */
type Messages = Dictionary["auth"]["validation"];

const PASSWORD_MIN = 10;
const LOWER = /[a-ząćęłńóśźż]/;
const UPPER = /[A-ZĄĆĘŁŃÓŚŹŻ]/;
const DIGIT = /[0-9]/;

export function passwordSchema(t: Messages) {
  return z
    .string()
    .min(PASSWORD_MIN, t.passwordTooShort)
    .max(128, t.passwordTooLong)
    .regex(LOWER, t.passwordNeedsLower)
    .regex(UPPER, t.passwordNeedsUpper)
    .regex(DIGIT, t.passwordNeedsDigit);
}

export type PasswordRule = "length" | "upper" | "lower" | "digit";

/**
 * Które wymagania hasło już spełnia — do listy z ptaszkami pod polem.
 * Te same warunki, co w `passwordSchema`, więc lista nie może obiecać
 * hasła, które serwer potem odrzuci.
 */
export function passwordChecks(value: string): Record<PasswordRule, boolean> {
  return {
    length: value.length >= PASSWORD_MIN,
    upper: UPPER.test(value),
    lower: LOWER.test(value),
    digit: DIGIT.test(value),
  };
}

/**
 * Kolejność jest istotna: najpierw normalizacja (trim + małe litery), dopiero
 * potem sprawdzenie formatu. Odwrotnie „ Jan@Przyklad.pl " zostałoby odrzucone
 * przez spacje, które i tak zaraz usuwamy — a użytkownicy wklejają adresy
 * z e-maili razem ze spacją.
 */
export function emailSchema(t: Messages) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z.string().min(1, t.emailRequired).max(254, t.emailTooLong).pipe(z.email(t.emailInvalid)),
    );
}

export function registerSchema(t: Messages) {
  return z.object({
    name: z.string().trim().min(2, t.nameRequired).max(120, t.nameTooLong),
    organizationName: z
      .string()
      .trim()
      .min(2, t.organizationRequired)
      .max(120, t.organizationTooLong),
    email: emailSchema(t),
    password: passwordSchema(t),
  });
}

export type RegisterInput = z.input<ReturnType<typeof registerSchema>>;
export type RegisterOutput = z.output<ReturnType<typeof registerSchema>>;

export function loginSchema(t: Messages) {
  return z.object({
    email: emailSchema(t),
    // Przy logowaniu nie sprawdzamy siły hasła — tylko czy w ogóle je podano.
    // Reguły złożoności mogły się zmienić od czasu założenia konta.
    password: z.string().min(1, t.passwordRequired),
  });
}

export type LoginInput = z.input<ReturnType<typeof loginSchema>>;

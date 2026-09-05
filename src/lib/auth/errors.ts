import { CredentialsSignin } from "next-auth";

import type { Dictionary } from "@/lib/i18n/types";

/**
 * Kody błędów logowania przekazywane do formularza.
 *
 * NextAuth celowo nie ujawnia, czy nie zgadza się e-mail, czy hasło — inaczej
 * formularz stałby się wyrocznią „czy ten adres ma konto w Rentiksie".
 * Wyjątkiem jest limit prób: użytkownik musi wiedzieć, że ma odczekać,
 * bo inaczej będzie w kółko wpisywał poprawne hasło.
 */
export const AUTH_ERROR_CODES = {
  invalidCredentials: "invalid_credentials",
  rateLimited: "rate_limited",
} as const;

/** Przekroczono limit prób logowania dla danego konta. */
export class RateLimitError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.rateLimited;
}

/** Zły e-mail lub złe hasło — bez rozróżnienia, które. */
export class InvalidCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODES.invalidCredentials;
}

/**
 * Komunikat do pokazania w formularzu logowania.
 *
 * Teksty wchodzą parametrem, a nie przez kod języka — plik importuje komponent
 * kliencki, więc sięgnięcie po słownik wciągnęłoby do przeglądarki wszystkie
 * wersje krajowe naraz.
 */
export function loginErrorMessage(
  code: string | undefined | null,
  t: Dictionary["auth"]["errors"],
): string {
  switch (code) {
    case AUTH_ERROR_CODES.rateLimited:
      return t.rateLimited;
    case AUTH_ERROR_CODES.invalidCredentials:
      return t.invalidCredentials;
    /*
      Kody z przepływu OAuth. NextAuth przekierowuje na stronę wskazaną
      w `pages.error` (czyli tutaj) z parametrem `?error=`, więc trafiają
      do tej samej funkcji co błędy formularza.
    */
    case "OAuthAccountNotLinked":
      return t.oauthAccountNotLinked;
    case "OAuthCallbackError":
    case "OAuthSignInError":
      return t.oauthFailed;
    case "AccessDenied":
      return t.accessDenied;
    default:
      return t.unknown;
  }
}

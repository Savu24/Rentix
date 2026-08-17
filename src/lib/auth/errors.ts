import { CredentialsSignin } from "next-auth";

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

/** Komunikaty pokazywane w formularzu logowania. */
export function loginErrorMessage(code: string | undefined | null): string {
  switch (code) {
    case AUTH_ERROR_CODES.rateLimited:
      return "Zbyt wiele prób logowania. Odczekaj 15 minut i spróbuj ponownie.";
    case AUTH_ERROR_CODES.invalidCredentials:
      return "Nieprawidłowy e-mail lub hasło.";
    default:
      return "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.";
  }
}

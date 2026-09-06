import { env } from "@/lib/env";

import { invitationPath } from "./tokens";

/**
 * Pełny adres zaproszenia do wklejenia w wiadomość.
 *
 * Osobno od `tokens.ts`, bo sięga po `env`, a tamten plik ma zostać wolny od
 * konfiguracji — inaczej test tokenów wymagałby adresu bazy danych.
 *
 * Bez `APP_URL` link byłby względny i nie kliknąłby się w skrzynce, dlatego
 * spadamy na `AUTH_URL`, a na końcu na adres lokalny — ten ostatni ma sens
 * wyłącznie w pracy deweloperskiej i widać po nim, że zmiennej brakuje.
 */
export function invitationUrl(token: string): string {
  const base = env.APP_URL ?? env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${invitationPath(token)}`;
}

import { env } from "@/lib/env";

/**
 * Czy logowanie przez Google jest w ogóle skonfigurowane.
 *
 * Osobny plik, żeby strony logowania i rejestracji mogły o to zapytać bez
 * ciągnięcia całego `./index` — a razem z nim NextAuth, adaptera i Prismy —
 * tylko po to, by zdecydować o widoczności jednego przycisku.
 */
export const googleEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

/**
 * Limiter w stałym oknie czasowym, trzymany w pamięci procesu.
 *
 * ⚠️ Świadome ograniczenie MVP: przy wielu instancjach (Render z >1 workerem,
 * funkcje Vercela) każda ma własny licznik, więc realny limit jest
 * przemnożony przez liczbę instancji. Przed produkcją podmieniamy
 * implementację `consume()` na Redis/Upstash — reszta kodu się nie zmienia,
 * bo wszyscy wołają wyłącznie ten interfejs.
 */

export type RateLimitResult = {
  success: boolean;
  /** Ile prób zostało w bieżącym oknie. */
  remaining: number;
  /** Za ile sekund okno się zresetuje (do nagłówka Retry-After). */
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Usuwa wygasłe wpisy, żeby mapa nie rosła w nieskończoność. */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitOptions = {
  /** Maksymalna liczba prób w oknie. */
  limit: number;
  /** Długość okna w sekundach. */
  windowSeconds: number;
};

export function consume(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: options.limit - 1,
      retryAfterSeconds: options.windowSeconds,
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.limit) {
    return { success: false, remaining: 0, retryAfterSeconds };
  }

  return {
    success: true,
    remaining: options.limit - existing.count,
    retryAfterSeconds,
  };
}

/** Czyści licznik po udanej akcji (np. poprawnym zalogowaniu). */
export function reset(key: string) {
  buckets.delete(key);
}

/** Wyłącznie do testów — zeruje cały stan limitera. */
export function resetAll() {
  buckets.clear();
}

/** Polityki limitów w jednym miejscu, żeby dało się je przejrzeć na raz. */
export const LIMITS = {
  /** Logowanie: 5 prób na 15 minut na jeden adres e-mail. */
  login: { limit: 5, windowSeconds: 15 * 60 },
  /** Rejestracja: 5 kont na godzinę z jednego IP. */
  register: { limit: 5, windowSeconds: 60 * 60 },
  /**
   * Zmiana hasła: 5 prób na 15 minut na konto. Sesja jest już aktywna, więc
   * limit chroni nie przed obcym, tylko przed zgadywaniem obecnego hasła
   * na przejętym, niezablokowanym komputerze.
   */
  passwordChange: { limit: 5, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimitOptions>;

/**
 * Adres klienta na podstawie nagłówków proxy (Render, Vercel, nginx).
 * Zwraca "unknown", gdy nagłówków brak — wtedy wszyscy tacy klienci dzielą
 * jeden licznik, co jest bezpieczniejsze niż brak limitu.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

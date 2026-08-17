import { Redis } from "@upstash/redis";

/**
 * Limiter w stałym oknie czasowym.
 *
 * Dwie implementacje za jednym interfejsem:
 *
 * - **Redis (Upstash)**, gdy ustawione są `UPSTASH_REDIS_REST_URL`
 *   i `UPSTASH_REDIS_REST_TOKEN`. Licznik jest wspólny dla wszystkich instancji,
 *   więc limit znaczy to, co obiecuje.
 * - **pamięć procesu** w pozostałych przypadkach — do pracy lokalnej i testów.
 *
 * Ten wybór jest istotny na serverless. Na Vercelu każde żądanie może trafić
 * do świeżej instancji, a licznik w pamięci startuje wtedy od zera: „5 prób
 * logowania na 15 minut" zamienia się w „5 prób na instancję", czyli
 * praktycznie brak ochrony przed zgadywaniem haseł.
 */

export type RateLimitResult = {
  success: boolean;
  /** Ile prób zostało w bieżącym oknie. */
  remaining: number;
  /** Za ile sekund okno się zresetuje (do nagłówka Retry-After). */
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** Maksymalna liczba prób w oknie. */
  limit: number;
  /** Długość okna w sekundach. */
  windowSeconds: number;
};

// ── Backend w pamięci procesu ──────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Usuwa wygasłe wpisy, żeby mapa nie rosła w nieskończoność. */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function consumeInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
    return { success: true, remaining: options.limit - 1, retryAfterSeconds: options.windowSeconds };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.limit) {
    return { success: false, remaining: 0, retryAfterSeconds };
  }

  return { success: true, remaining: options.limit - existing.count, retryAfterSeconds };
}

// ── Backend na Redisie ─────────────────────────────────────────────────────

/**
 * Klient powstaje leniwie i siedzi na `globalThis` — hot reload w trybie
 * deweloperskim inaczej tworzyłby nowego przy każdej zmianie pliku.
 */
const globalForRedis = globalThis as unknown as { rateLimitRedis?: Redis | null };

function redisClient(): Redis | null {
  if (globalForRedis.rateLimitRedis !== undefined) return globalForRedis.rateLimitRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    globalForRedis.rateLimitRedis = null;
    return null;
  }

  try {
    globalForRedis.rateLimitRedis = new Redis({ url, token });
  } catch (error) {
    // Konstruktor rzuca przy błędnym adresie — na przykład gdy zamiast adresu
    // REST wklejono connection string `redis://`. Wynik zapamiętujemy jako
    // `null`, więc kolejne żądania nie próbują od nowa przy każdym wywołaniu.
    console.error("[rate-limit] Błędna konfiguracja Upstash, liczę w pamięci:", error);
    globalForRedis.rateLimitRedis = null;
  }

  return globalForRedis.rateLimitRedis;
}

export function isDistributed(): boolean {
  return redisClient() !== null;
}

async function consumeInRedis(
  redis: Redis,
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;

  // INCR i TTL jednym przelotem. Klucz bez wygaśnięcia (TTL < 0) oznacza
  // pierwszą próbę w oknie — dopiero wtedy ustawiamy czas życia, żeby okno
  // liczyło się od pierwszej próby, a nie przesuwało z każdą kolejną.
  const pipeline = redis.pipeline();
  pipeline.incr(redisKey);
  pipeline.ttl(redisKey);
  const [count, ttl] = (await pipeline.exec()) as [number, number];

  let retryAfterSeconds = ttl;
  if (ttl < 0) {
    await redis.expire(redisKey, options.windowSeconds);
    retryAfterSeconds = options.windowSeconds;
  }

  if (count > options.limit) {
    return { success: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  return {
    success: true,
    remaining: options.limit - count,
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
  };
}

// ── Interfejs publiczny ────────────────────────────────────────────────────

export async function consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  // Cała ścieżka w try, łącznie z utworzeniem klienta. Limiter jest
  // zabezpieczeniem, a nie warunkiem działania aplikacji: żaden jego błąd nie
  // może wywrócić logowania ani rejestracji. Wcześniej konstruktor klienta stał
  // poza tym blokiem i błędny adres Upstasha kończył się błędem 500 na każdym
  // endpoincie, który sięgał po limiter.
  try {
    const redis = redisClient();
    if (!redis) return consumeInMemory(key, options);

    return await consumeInRedis(redis, key, options);
  } catch (error) {
    console.error("[rate-limit] Limiter niedostępny, przepuszczam żądanie:", error);
    return { success: true, remaining: options.limit - 1, retryAfterSeconds: options.windowSeconds };
  }
}

/** Czyści licznik po udanej akcji (np. poprawnym zalogowaniu). */
export async function reset(key: string): Promise<void> {
  try {
    const redis = redisClient();

    if (!redis) {
      buckets.delete(key);
      return;
    }

    await redis.del(`rl:${key}`);
  } catch (error) {
    console.error("[rate-limit] Nie udało się wyzerować licznika:", error);
  }
}

/** Wyłącznie do testów — zeruje stan limitera w pamięci. */
export function resetAll() {
  buckets.clear();
  globalForRedis.rateLimitRedis = undefined;
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
 * Adres klienta na podstawie nagłówków proxy (Vercel, Render, nginx).
 * Zwraca "unknown", gdy nagłówków brak — wtedy wszyscy tacy klienci dzielą
 * jeden licznik, co jest bezpieczniejsze niż brak limitu.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

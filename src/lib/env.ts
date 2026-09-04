import { z } from "zod";

/**
 * Walidacja zmiennych środowiskowych. Aplikacja ma paść przy starcie
 * z czytelnym komunikatem, a nie dopiero przy pierwszym zapytaniu do bazy.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL jest wymagany"),
  /**
   * Połączenie sesyjne wyłącznie do migracji (Supabase, port 5432).
   *
   * Na serverless `DATABASE_URL` wskazuje transaction pooler (6543), po którym
   * `prisma migrate deploy` nie przejdzie. Czyta je `prisma.config.ts`, a nie
   * kod aplikacji — tutaj stoi po to, żeby literówka w nazwie wyszła przy
   * starcie, a nie przy pierwszym wdrożeniu ze zmianą schematu.
   */
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET musi mieć co najmniej 32 znaki — wygeneruj: npx auth secret"),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  /**
   * Logowanie przez Google (OAuth 2.0), dane z Google Cloud → Credentials.
   *
   * Nazwy z prefiksem `AUTH_` są konwencją Auth.js, ale provider dostaje je
   * wprost — dzięki temu brak kompletu wyłącza przycisk „Zaloguj przez Google"
   * zamiast wywalać logowanie błędem konfiguracji na produkcji.
   */
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),

  /**
   * Zwykły SMTP — alternatywa dla Resendu.
   *
   * Pozwala wysyłać z istniejącej skrzynki (Gmail, poczta hostingu, Brevo),
   * czyli bez konfigurowania rekordów DNS dla własnej domeny. Wszystkie trzy
   * pola razem albo żadne; komplet sprawdzamy poniżej, bo brak jednego cicho
   * wyłączałby wysyłkę.
   */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("Rentix <no-reply@rentixon.com>"),
  /** Publiczny adres aplikacji — baza `metadataBase` dla odnośników w metadanych. */
  APP_URL: z.url().optional(),
  /**
   * Wspólny sekret endpointu cronowego (`/api/cron/billing`). Bez niego
   * endpoint nie działa: naliczanie miesięczne nie może być otwarte dla świata.
   */
  CRON_SECRET: z.string().min(16, "CRON_SECRET musi mieć co najmniej 16 znaków").optional(),

  /**
   * Redis dla limitera prób logowania (Upstash, REST).
   *
   * Bez tych dwóch zmiennych limiter liczy w pamięci procesu, co na serverless
   * oznacza licznik startujący od zera przy każdej instancji — czyli brak
   * realnej ochrony. Obie albo żadna; jedna bez drugiej to literówka.
   */
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Puste zmienne traktujemy jak nieustawione.
 *
 * Panele hostingu (Vercel, Render) pozwalają dodać zmienną bez wartości, a taka
 * przychodzi jako pusty string — czyli coś, czego `??` nie łapie, bo to nie jest
 * `undefined`. Pusty `AUTH_URL` wywracał w ten sposób budowanie na `new URL("")`
 * z komunikatem „Invalid URL", w którym nie było nawet nazwy zmiennej.
 *
 * Odsiewamy je raz, tutaj, zamiast bronić się przed pustym stringiem w każdym
 * miejscu użycia osobno.
 */
function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[1].trim() !== "",
    ),
  );
}

function loadEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(withoutBlanks(process.env));

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Nieprawidłowa konfiguracja środowiska:\n${issues}\n\nSkopiuj .env.example do .env i uzupełnij wartości.`,
    );
  }

  const env = parsed.data;

  const smtpFields = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASSWORD];
  if (smtpFields.some(Boolean) && !smtpFields.every(Boolean)) {
    throw new Error(
      "Ustaw SMTP_HOST, SMTP_USER i SMTP_PASSWORD razem — niepełny komplet po cichu wyłącza wysyłkę poczty.",
    );
  }

  if (Boolean(env.AUTH_GOOGLE_ID) !== Boolean(env.AUTH_GOOGLE_SECRET)) {
    throw new Error(
      "Ustaw AUTH_GOOGLE_ID i AUTH_GOOGLE_SECRET razem — samo ID bez sekretu kończy się błędem dopiero po kliknięciu „Zaloguj przez Google”.",
    );
  }

  if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
    throw new Error(
      "Ustaw UPSTASH_REDIS_REST_URL i UPSTASH_REDIS_REST_TOKEN razem — sam adres bez tokenu (albo odwrotnie) po cichu wyłącza limiter.",
    );
  }

  return env;
}

export const env = loadEnv();

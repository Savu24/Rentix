import { z } from "zod";

/**
 * Walidacja zmiennych środowiskowych. Aplikacja ma paść przy starcie
 * z czytelnym komunikatem, a nie dopiero przy pierwszym zapytaniu do bazy.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL jest wymagany"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET musi mieć co najmniej 32 znaki — wygeneruj: npx auth secret"),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Rentix <no-reply@rentix.pl>"),
  /** Publiczny adres aplikacji — linki w e-mailach do najemców. */
  APP_URL: z.url().optional(),
  /**
   * Wspólny sekret endpointu cronowego (`/api/cron/billing`). Bez niego
   * endpoint nie działa: naliczanie miesięczne nie może być otwarte dla świata.
   */
  CRON_SECRET: z.string().min(16, "CRON_SECRET musi mieć co najmniej 16 znaków").optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Nieprawidłowa konfiguracja środowiska:\n${issues}\n\nSkopiuj .env.example do .env i uzupełnij wartości.`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

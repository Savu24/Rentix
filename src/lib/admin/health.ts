import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Stan platformy: co jest podpięte i czy kolejka wysyłki się nie zatkała.
 *
 * Pierwsza część czyta wyłącznie **obecność** zmiennych środowiskowych, nigdy
 * ich wartości — panel ma odpowiadać na pytanie „czy wysyłka e-mail w ogóle
 * działa", a nie wystawiać klucze API na ekran przeglądarki.
 *
 * Druga część patrzy na powiadomienia, bo to jedyny proces w tle, który potrafi
 * cicho paść: nocny cron naliczy faktury, a listy nie wyjdą, i nikt się o tym
 * nie dowie, dopóki najemca nie zapyta, czemu nie dostał wezwania.
 */

export type IntegrationState = "on" | "off" | "partial";

export type Integration = {
  name: string;
  state: IntegrationState;
  detail: string;
};

export function integrations(): Integration[] {
  const smtp = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASSWORD];
  const smtpSet = smtp.filter(Boolean).length;

  const mail: Integration = env.RESEND_API_KEY
    ? { name: "Wysyłka e-mail", state: "on", detail: `Resend, nadawca ${env.EMAIL_FROM}` }
    : smtpSet === smtp.length
      ? {
          name: "Wysyłka e-mail",
          state: "on",
          detail: `SMTP ${env.SMTP_HOST}:${env.SMTP_PORT}, nadawca ${env.EMAIL_FROM}`,
        }
      : {
          name: "Wysyłka e-mail",
          state: smtpSet > 0 ? "partial" : "off",
          detail:
            smtpSet > 0
              ? "Niepełna konfiguracja SMTP — brakuje hosta, użytkownika albo hasła."
              : "Brak RESEND_API_KEY i danych SMTP. Powiadomienia nie wyjdą.",
        };

  const google: Integration = {
    name: "Logowanie Google",
    state: env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET ? "on" : "off",
    detail:
      env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
        ? "Przycisk „Zaloguj przez Google” jest widoczny."
        : "Brak AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET — zostaje logowanie hasłem.",
  };

  const redis: Integration = {
    name: "Limiter prób logowania",
    state: env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? "on" : "off",
    detail:
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? "Upstash Redis — licznik wspólny dla wszystkich instancji."
        : "Licznik w pamięci procesu. Na serverless startuje od zera przy każdej instancji.",
  };

  const cron: Integration = {
    name: "Nocne naliczanie",
    state: env.CRON_SECRET ? "on" : "off",
    detail: env.CRON_SECRET
      ? "Endpoint /api/cron/billing przyjmuje wywołania z sekretem."
      : "Brak CRON_SECRET — endpoint odmawia, faktury nie naliczą się same.",
  };

  const payments: Integration = {
    name: "Operator płatności",
    state: "off",
    detail: "Brak integracji. Plany zmienia się ręcznie z tego panelu.",
  };

  return [mail, google, redis, cron, payments];
}

export type NotificationQueue = {
  pending: number;
  failed: number;
  sentLast7Days: number;
  /** Ostatnia udana wysyłka — cisza dłuższa niż doba znaczy, że coś stoi. */
  lastSentAt: Date | null;
  recentFailures: { id: string; createdAt: Date; toEmail: string | null; error: string | null }[];
};

export async function notificationQueue(): Promise<NotificationQueue> {
  const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pending, failed, sentLast7Days, lastSent, recentFailures] = await Promise.all([
    prisma.notification.count({ where: { status: "PENDING" } }),
    prisma.notification.count({ where: { status: "FAILED" } }),
    prisma.notification.count({ where: { status: "SENT", sentAt: { gte: since7Days } } }),
    prisma.notification.findFirst({
      where: { status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.notification.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, toEmail: true, error: true },
    }),
  ]);

  return {
    pending,
    failed,
    sentLast7Days,
    lastSentAt: lastSent?.sentAt ?? null,
    recentFailures,
  };
}

export type BillingRun = {
  /** Ostatnia wystawiona faktura — ślad po ostatnim przebiegu naliczania. */
  lastInvoiceAt: Date | null;
  invoicesLast24h: number;
};

/**
 * Ostatni przebieg naliczania, odczytany po skutkach.
 *
 * Cron nie zapisuje własnego dziennika, więc pytamy o to, co po nim zostaje.
 * Brak faktury od kilku dni na początku miesiąca znaczy, że scheduler nie
 * dzwoni — a to jedyny objaw, po którym da się to zauważyć przed reklamacją.
 */
export async function lastBillingRun(): Promise<BillingRun> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [last, invoicesLast24h] = await Promise.all([
    prisma.invoice.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.invoice.count({ where: { createdAt: { gte: since24h } } }),
  ]);

  return { lastInvoiceAt: last?.createdAt ?? null, invoicesLast24h };
}

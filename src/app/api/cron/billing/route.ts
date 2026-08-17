import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { env } from "@/lib/env";
import { generateInvoicesForMonth } from "@/lib/invoices/service";
import { sendPaymentNotifications } from "@/lib/notifications/reminders";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Naliczanie chodzi po wszystkich organizacjach — wynik nie może trafić do cache'u.
export const dynamic = "force-dynamic";

/**
 * Nocny przebieg rozliczeniowy: naliczenie czynszu i wysyłka przypomnień.
 *
 * Uruchamiany codziennie przez zewnętrzny scheduler (Render Cron Job albo
 * Vercel Cron). Codziennie, a nie raz w miesiącu, z dwóch powodów: umowy mają
 * różne dni naliczania, a przypomnienia o terminach muszą wychodzić na bieżąco.
 * Oba kroki są idempotentne, więc powtórzony przebieg niczego nie dubluje.
 *
 * Autoryzacja przez wspólny sekret w nagłówku `Authorization: Bearer …` —
 * endpoint nie ma sesji użytkownika, a bez sekretu ktokolwiek mógłby
 * wygenerować dokumenty na cudzym koncie.
 */
async function run(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return apiError(
      "FORBIDDEN",
      "CRON_SECRET nie jest ustawiony — endpoint rozliczeniowy jest wyłączony.",
    );
  }

  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Nieprawidłowy sekret zadania cyklicznego.");
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const organizations = await prisma.organization.findMany({ select: { id: true } });

  let createdCount = 0;
  const perOrganization: Array<{ organizationId: string; created: number; skipped: number }> = [];

  for (const organization of organizations) {
    const result = await generateInvoicesForMonth(
      organization.id,
      { year, month, leaseId: null, tenantId: null },
      // Dzień naliczania musi już minąć — inaczej pierwszego dnia miesiąca
      // wystawialibyśmy dokumenty z datą w przyszłości.
      { notBefore: now },
    );

    createdCount += result.created.length;
    perOrganization.push({
      organizationId: organization.id,
      created: result.created.length,
      skipped: result.skipped.length,
    });
  }

  // Przypomnienia idą po naliczeniu, żeby świeżo wystawione dokumenty od razu
  // trafiły do najemców jednym przebiegiem.
  const notifications = await sendPaymentNotifications({ now });

  return ok({
    ranAt: now.toISOString(),
    period: { year, month },
    organizations: organizations.length,
    invoicesCreated: createdCount,
    perOrganization,
    notifications: {
      sent: notifications.sent,
      failed: notifications.failed,
      skipped: notifications.skipped,
    },
  });
}

/** Vercel Cron woła GET-em, Render Cron Job zwykle `curl -X POST`. */
export const GET = run;
export const POST = run;

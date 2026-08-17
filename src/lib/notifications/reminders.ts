import type { NotificationType } from "@/generated/prisma/enums";
import { sendEmail, type EmailContent } from "@/lib/email/client";
import {
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type InvoiceEmailData,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import { daysOverdue, remainingGrosze } from "@/lib/invoices/status";
import { periodLabel } from "@/lib/leases/billing";
import { prisma } from "@/lib/prisma";

import { chooseNotification } from "./schedule";

/**
 * Przypomnienia o płatnościach.
 *
 * Jedna funkcja obsługuje trzy powiadomienia (wystawienie, zbliżający się
 * termin, zaległość), bo wszystkie wychodzą z tego samego zbioru dokumentów
 * i konkurują ze sobą: najemca ma dostać jedną wiadomość dziennie, a nie trzy.
 * Pierwszeństwo ma najpilniejsza.
 */

/**
 * Adres aplikacji do linków w wiadomościach.
 *
 * `APP_URL` jest opcjonalny — na środowisku bez skonfigurowanego adresu
 * wysyłamy e-mail bez przycisku zamiast linku prowadzącego w `undefined`.
 */
function invoiceUrl(invoiceId: string): string | null {
  const base = env.APP_URL ?? env.AUTH_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/panel/finanse/${invoiceId}`;
}

export type NotificationOutcome = {
  invoiceId: string;
  type: NotificationType;
  status: "SENT" | "FAILED" | "SKIPPED";
  toEmail: string | null;
  error?: string;
};

export type ReminderRun = {
  sent: number;
  failed: number;
  skipped: number;
  outcomes: NotificationOutcome[];
};

function buildEmail(
  type: NotificationType,
  data: InvoiceEmailData,
  overdueDaysCount: number,
): EmailContent {
  switch (type) {
    case "PAYMENT_OVERDUE":
      return paymentOverdueEmail({ ...data, daysOverdue: overdueDaysCount });
    case "PAYMENT_REMINDER":
      return paymentReminderEmail(data);
    default:
      return invoiceIssuedEmail(data);
  }
}

/**
 * Wysyła powiadomienia o płatnościach dla nieopłaconych dokumentów.
 *
 * Wynik każdej wysyłki ląduje w tabeli `notifications` — także nieudany.
 * Dzięki temu ponowne uruchomienie nie zdubluje wiadomości, która poszła,
 * ale spróbuje jeszcze raz tej, która padła na błędzie bramki.
 *
 * `organizationId` zawęża przebieg do jednej organizacji (ręczne wywołanie
 * z panelu); jego brak oznacza przebieg cronowy dla wszystkich kont.
 */
export async function sendPaymentNotifications({
  organizationId,
  now = new Date(),
  limit = 500,
}: {
  organizationId?: string;
  now?: Date;
  limit?: number;
} = {}): Promise<ReminderRun> {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: { in: ["ISSUED", "PARTIALLY_PAID"] },
    },
    select: {
      id: true,
      number: true,
      issueDate: true,
      dueDate: true,
      periodStart: true,
      totalGrossGrosze: true,
      paidGrosze: true,
      status: true,
      organizationId: true,
      organization: { select: { name: true } },
      lease: {
        select: {
          tenants: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: { tenant: { select: { id: true, firstName: true, email: true, userId: true } } },
          },
        },
      },
      notifications: {
        where: { status: "SENT" },
        select: { type: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { dueDate: "asc" },
    take: limit,
  });

  const outcomes: NotificationOutcome[] = [];

  for (const invoice of invoices) {
    // Ostatnia udana wysyłka każdego rodzaju — lista jest posortowana malejąco,
    // więc pierwszy wpis danego typu jest tym najnowszym.
    const sentTypes = new Map<NotificationType, Date>();
    for (const notification of invoice.notifications) {
      if (!sentTypes.has(notification.type)) sentTypes.set(notification.type, notification.createdAt);
    }

    const type = chooseNotification({ ...invoice, sentTypes }, now);
    if (!type) continue;

    const tenant = invoice.lease?.tenants[0]?.tenant;

    // Dokument jednorazowy bez umowy nie ma najemcy, a najemca bez adresu
    // e-mail nie ma jak dostać wiadomości — w obu przypadkach nie ma czego
    // zapisywać w kolejce, więc tylko raportujemy pominięcie.
    if (!tenant?.email) {
      outcomes.push({ invoiceId: invoice.id, type, status: "SKIPPED", toEmail: null });
      continue;
    }

    const remaining = remainingGrosze(invoice);
    const emailData: InvoiceEmailData = {
      tenantFirstName: tenant.firstName,
      landlordName: invoice.organization.name,
      invoiceNumber: invoice.number,
      amountGrosze: invoice.totalGrossGrosze,
      remainingGrosze: remaining,
      dueDate: invoice.dueDate,
      periodLabel: invoice.periodStart
        ? periodLabel(invoice.periodStart.getUTCFullYear(), invoice.periodStart.getUTCMonth())
        : null,
      invoiceUrl: invoiceUrl(invoice.id),
    };

    const content = buildEmail(type, emailData, daysOverdue(invoice.dueDate, now));
    const result = await sendEmail({ to: tenant.email, ...content });

    await prisma.notification.create({
      data: {
        organizationId: invoice.organizationId,
        // Powiadomienie w panelu zobaczy tylko najemca z kontem; bez konta
        // zostaje sam e-mail.
        userId: tenant.userId,
        type,
        channel: "EMAIL",
        status: result.ok ? "SENT" : "FAILED",
        title: content.subject,
        body: content.text,
        toEmail: tenant.email,
        invoiceId: invoice.id,
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? null : result.error,
      },
    });

    outcomes.push({
      invoiceId: invoice.id,
      type,
      status: result.ok ? "SENT" : "FAILED",
      toEmail: tenant.email,
      ...(result.ok ? {} : { error: result.error }),
    });
  }

  return {
    sent: outcomes.filter((outcome) => outcome.status === "SENT").length,
    failed: outcomes.filter((outcome) => outcome.status === "FAILED").length,
    skipped: outcomes.filter((outcome) => outcome.status === "SKIPPED").length,
    outcomes,
  };
}

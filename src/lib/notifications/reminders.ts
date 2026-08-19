import type { NotificationType } from "@/generated/prisma/enums";
import { sendEmail, type EmailContent } from "@/lib/email/client";
import {
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type InvoiceEmailData,
  type TemplateFields,
} from "@/lib/email/templates";
import { getInvoice } from "@/lib/invoices/service";
import { renderInvoicePdf } from "@/lib/invoices/render";
import { invoiceRecipient } from "@/lib/invoices/recipient";
import { daysOverdue, remainingGrosze } from "@/lib/invoices/status";
import { periodLabel } from "@/lib/leases/billing";
import { prisma } from "@/lib/prisma";
import { formatPropertyAddress } from "@/lib/properties/address";

import { mailSettingsLoader } from "./settings";
import { chooseNotification } from "./schedule";

/**
 * Przypomnienia o płatnościach.
 *
 * Jedna funkcja obsługuje trzy powiadomienia (wystawienie, zbliżający się
 * termin, zaległość), bo wszystkie wychodzą z tego samego zbioru dokumentów
 * i konkurują ze sobą: najemca ma dostać jedną wiadomość dziennie, a nie trzy.
 * Pierwszeństwo ma najpilniejsza.
 */

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
  fields?: TemplateFields | null,
): EmailContent {
  switch (type) {
    case "PAYMENT_OVERDUE":
      return paymentOverdueEmail({ ...data, daysOverdue: overdueDaysCount }, fields);
    case "PAYMENT_REMINDER":
      return paymentReminderEmail(data, fields);
    default:
      return invoiceIssuedEmail(data, fields);
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
      organization: { select: { name: true, contactEmail: true } },
      // Nabywca dokumentu wystawionego poza umowa — bez tego jednorazowy
      // rachunek nie mial adresata i nie dostawal zadnych przypomnien.
      tenant: {
        select: { id: true, firstName: true, lastName: true, email: true, userId: true },
      },
      lease: {
        select: {
          sendInvoicesByEmail: true,
          property: {
            select: {
              street: true,
              buildingNumber: true,
              apartmentNumber: true,
              postalCode: true,
              city: true,
            },
          },
          tenants: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: {
              tenant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  userId: true,
                },
              },
            },
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
  // Ustawienia poczty wczytujemy raz na organizację, nie raz na dokument.
  const mailSettings = mailSettingsLoader();

  for (const invoice of invoices) {
    const settings = await mailSettings(invoice.organizationId);

    // Ostatnia udana wysyłka każdego rodzaju — lista jest posortowana malejąco,
    // więc pierwszy wpis danego typu jest tym najnowszym.
    const sentTypes = new Map<NotificationType, Date>();
    for (const notification of invoice.notifications) {
      if (!sentTypes.has(notification.type)) sentTypes.set(notification.type, notification.createdAt);
    }

    const type = chooseNotification(
      { ...invoice, sentTypes },
      now,
      settings.schedule,
      settings.enabled,
    );
    if (!type) continue;

    /*
      Umowa z wyłączoną wysyłką nie dostaje niczego automatem. Sprawdzamy to
      dopiero tutaj, a nie w zapytaniu: dokument bez umowy też ma wychodzić,
      więc warunek „umowa pozwala albo umowy nie ma" nie zawęża zbioru, tylko
      odsiewa konkretne przypadki.
    */
    if (invoice.lease && !invoice.lease.sendInvoicesByEmail) {
      outcomes.push({ invoiceId: invoice.id, type, status: "SKIPPED", toEmail: null });
      continue;
    }

    const tenant = invoiceRecipient(invoice);

    // Dokument bez nabywcy i bez umowy nie ma adresata, a najemca bez adresu
    // e-mail nie ma jak dostać wiadomości — w obu przypadkach nie ma czego
    // zapisywać w kolejce, więc tylko raportujemy pominięcie.
    if (!tenant?.email) {
      outcomes.push({ invoiceId: invoice.id, type, status: "SKIPPED", toEmail: null });
      continue;
    }

    const remaining = remainingGrosze(invoice);
    const property = invoice.lease?.property;
    const emailData: InvoiceEmailData = {
      tenantFirstName: tenant.firstName,
      tenantLastName: tenant.lastName,
      propertyAddress: property ? formatPropertyAddress(property) : null,
      // Nazwa, którą wynajmujący pokazuje najemcom — trafia i w treść, i w pole
      // nadawcy, więc nie może się rozjechać między jednym a drugim.
      landlordName: settings.senderName || invoice.organization.name,
      invoiceNumber: invoice.number,
      amountGrosze: invoice.totalGrossGrosze,
      remainingGrosze: remaining,
      dueDate: invoice.dueDate,
      periodLabel: invoice.periodStart
        ? periodLabel(invoice.periodStart.getUTCFullYear(), invoice.periodStart.getUTCMonth())
        : null,
      // PDF dokładamy tylko przy zawiadomieniu o wystawieniu. Przy
      // przypomnieniu i wezwaniu najemca ma dokument od tygodni — powtarzanie
      // załącznika zapycha skrzynkę i wydłuża nocny przebieg o kolejne
      // renderowania.
      attached: type === "INVOICE_ISSUED",
    };

    const content = buildEmail(
      type,
      emailData,
      daysOverdue(invoice.dueDate, now),
      settings.templates.get(type),
    );

    // Dokument renderujemy dopiero tutaj, dla tej jednej wiadomości — nie ma
    // sensu składać PDF-a dla najemcy bez adresu e-mail ani dla dokumentu,
    // o którym już powiadomiliśmy.
    let attachments;
    if (emailData.attached) {
      const full = await getInvoice(invoice.organizationId, invoice.id);
      if (full) {
        const pdf = await renderInvoicePdf(full);
        attachments = [{ filename: pdf.filename, content: pdf.buffer }];
      }
    }

    // Nazwa wynajmującego w polu nadawcy, jego adres w Reply-To — nocny przebieg
    // obsługuje wszystkie organizacje naraz, więc nadawca musi wynikać
    // z dokumentu, a nie z konfiguracji. Patrz `src/lib/email/sender.ts`.
    const result = await sendEmail({
      to: tenant.email,
      fromName: emailData.landlordName,
      replyTo: settings.replyTo,
      ...content,
      attachments,
    });

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

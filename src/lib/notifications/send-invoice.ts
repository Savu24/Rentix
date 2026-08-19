import { sendEmail } from "@/lib/email/client";
import { invoiceIssuedEmail } from "@/lib/email/templates";
import { renderInvoicePdf } from "@/lib/invoices/render";
import { getInvoice } from "@/lib/invoices/service";
import { periodLabel } from "@/lib/leases/billing";
import { remainingGrosze } from "@/lib/invoices/status";
import { prisma } from "@/lib/prisma";
import { formatPropertyAddress } from "@/lib/properties/address";

import { organizationMailSettings } from "./settings";

/**
 * Wysyłka pojedynczego dokumentu do najemcy, na żądanie.
 *
 * Osobno od nocnego przebiegu, ale tym samym kanałem i z tym samym wpisem
 * w `notifications` — dzięki temu cron uzna dokument za już zapowiedziany
 * i nie wyśle go drugi raz nad ranem.
 */
export type SendInvoiceResult =
  | { ok: true; toEmail: string }
  | { ok: false; reason: "NOT_FOUND" }
  /** Dokument nie jest powiazany z umowa, wiec nie wiadomo, komu go wyslac. */
  | { ok: false; reason: "NO_LEASE" }
  | { ok: false; reason: "NO_RECIPIENT" }
  | { ok: false; reason: "CANCELLED" }
  | { ok: false; reason: "SEND_FAILED"; error: string };

export async function sendInvoiceToTenant(
  organizationId: string,
  invoiceId: string,
): Promise<SendInvoiceResult> {
  const invoice = await getInvoice(organizationId, invoiceId);
  if (!invoice) return { ok: false, reason: "NOT_FOUND" };
  if (invoice.status === "CANCELLED") return { ok: false, reason: "CANCELLED" };

  /*
    Dwie rozne przyczyny, dwa rozne komunikaty.

    Odbiorca wisi na umowie — `Invoice` nie ma wlasnego pola z najemca. Dokument
    jednorazowy, wystawiony poza umowa, nie ma wiec adresata w ogole, i to jest
    co innego niz najemca bez adresu e-mail. Jeden komunikat na oba przypadki
    odsylal do kartoteki najemcy takze wtedy, gdy adres byl tam uzupelniony —
    czyli kazal szukac bledu w miejscu, w ktorym go nie ma.
  */
  const tenant = invoice.lease?.tenants[0]?.tenant;
  if (!tenant) return { ok: false, reason: "NO_LEASE" };
  if (!tenant.email) return { ok: false, reason: "NO_RECIPIENT" };

  const settings = await organizationMailSettings(organizationId);
  const property = invoice.lease?.property;
  const landlordName = settings.senderName || invoice.organization.name;

  /*
    Wyłączenie automatu w ustawieniach nie blokuje tej ścieżki. Wynajmujący
    właśnie kliknął „wyślij" — odmowa z powołaniem na ustawienie harmonogramu
    byłaby odmawianiem wykonania polecenia, które przed chwilą wydał. Treść
    bierzemy z jego szablonu, bo to nadal jego wiadomość.
  */
  const content = invoiceIssuedEmail(
    {
      tenantFirstName: tenant.firstName,
      tenantLastName: tenant.lastName,
      propertyAddress: property ? formatPropertyAddress(property) : null,
      landlordName,
      invoiceNumber: invoice.number,
      amountGrosze: invoice.totalGrossGrosze,
      remainingGrosze: remainingGrosze(invoice),
      dueDate: invoice.dueDate,
      periodLabel: invoice.periodStart
        ? periodLabel(invoice.periodStart.getUTCFullYear(), invoice.periodStart.getUTCMonth())
        : null,
      attached: true,
    },
    settings.templates.get("INVOICE_ISSUED"),
  );

  const pdf = await renderInvoicePdf(invoice);

  const result = await sendEmail({
    to: tenant.email,
    // Najemca widzi w skrzynce swojego wynajmującego, a nie platformę,
    // i odpisuje prosto do niego. Patrz `src/lib/email/sender.ts`.
    fromName: landlordName,
    replyTo: settings.replyTo,
    ...content,
    attachments: [{ filename: pdf.filename, content: pdf.buffer }],
  });

  await prisma.notification.create({
    data: {
      organizationId,
      userId: tenant.userId,
      type: "INVOICE_ISSUED",
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

  if (!result.ok) return { ok: false, reason: "SEND_FAILED", error: result.error };
  return { ok: true, toEmail: tenant.email };
}

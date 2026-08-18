import { sendEmail } from "@/lib/email/client";
import { invoiceIssuedEmail } from "@/lib/email/templates";
import { renderInvoicePdf } from "@/lib/invoices/render";
import { getInvoice } from "@/lib/invoices/service";
import { periodLabel } from "@/lib/leases/billing";
import { remainingGrosze } from "@/lib/invoices/status";
import { prisma } from "@/lib/prisma";

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

  const tenant = invoice.lease?.tenants[0]?.tenant;
  if (!tenant?.email) return { ok: false, reason: "NO_RECIPIENT" };

  const content = invoiceIssuedEmail({
    tenantFirstName: tenant.firstName,
    landlordName: invoice.organization.name,
    invoiceNumber: invoice.number,
    amountGrosze: invoice.totalGrossGrosze,
    remainingGrosze: remainingGrosze(invoice),
    dueDate: invoice.dueDate,
    periodLabel: invoice.periodStart
      ? periodLabel(invoice.periodStart.getUTCFullYear(), invoice.periodStart.getUTCMonth())
      : null,
    attached: true,
  });

  const pdf = await renderInvoicePdf(invoice);

  const result = await sendEmail({
    to: tenant.email,
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

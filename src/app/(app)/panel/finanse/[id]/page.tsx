import { ArrowLeft, Download, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelInvoice } from "@/components/panel/invoices/cancel-invoice";
import { DeletePayment, RecordPayment } from "@/components/panel/invoices/record-payment";
import { SendInvoice } from "@/components/panel/invoices/send-invoice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { getInvoice } from "@/lib/invoices/service";
import { INVOICE_STATUS_META, remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { VAT_LABEL } from "@/lib/invoices/vat";
import { formatPLN } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { isSellerComplete } from "@/lib/organizations/service";
import { prisma } from "@/lib/prisma";
import { INVOICE_KIND_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/validations/invoice";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const invoice = await getInvoice(session.user.organizationId, id);

  return { title: invoice ? invoice.number : "Dokument" };
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });
const shortDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function InvoiceDetailPage({ params }: Params) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const invoice = await getInvoice(session.user.organizationId, id);
  if (!invoice) notFound();

  const now = new Date();
  const status = resolveInvoiceStatus(invoice, now);
  const meta = INVOICE_STATUS_META[status];
  const remaining = remainingGrosze(invoice);

  const property = invoice.lease?.property;

  // Ostatnie powiadomienie o tym dokumencie — właściciel widzi, czy najemca
  // w ogóle dostał wiadomość, zanim zacznie dzwonić w sprawie zaległości.
  const lastNotification = await getLastNotification(invoice.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/finanse"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Finanse
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">{invoice.number}</h1>
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <Badge>{INVOICE_KIND_LABEL[invoice.kind]}</Badge>
            </div>

            <p className="text-sm text-muted">
              Wystawiono {dateFormat.format(invoice.issueDate)} · termin płatności{" "}
              {dateFormat.format(invoice.dueDate)}
            </p>
          </div>

          <Button asChild size="sm" variant="secondary">
            {/* target="_blank": PDF otwiera się w podglądzie, a widok dokumentu zostaje. */}
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" aria-hidden />
              Pobierz PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Ostrzeżenie stoi tutaj, a nie tylko w ustawieniach: to jest moment,
          w którym za chwilę pobierzesz PDF i wyślesz go najemcy. */}
      {!isSellerComplete(invoice.organization) ? (
        <Alert tone="warning">
          Dane wystawcy są niepełne — dokument wyjdzie bez adresu sprzedawcy.{" "}
          <Link href="/panel/ustawienia" className="font-medium underline">
            Uzupełnij w ustawieniach
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="text-[13px] font-semibold text-fg">Nabywca</p>
            <p className="text-sm text-fg">{invoice.buyerName}</p>
            {invoice.buyerStreet ? (
              <p className="text-xs text-muted">{invoice.buyerStreet}</p>
            ) : null}
            {invoice.buyerPostalCode || invoice.buyerCity ? (
              <p className="text-xs text-muted">
                {[invoice.buyerPostalCode, invoice.buyerCity].filter(Boolean).join(" ")}
              </p>
            ) : null}
            {invoice.buyerTaxId ? (
              <p className="text-xs text-muted">NIP: {invoice.buyerTaxId}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              Dane skopiowane w chwili wystawienia — dokument pokazuje stan z tamtego dnia.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="text-[13px] font-semibold text-fg">Czego dotyczy</p>
            {property ? (
              <Link
                href={`/panel/nieruchomosci/${property.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                {property.name}
                {invoice.lease?.room ? ` · ${invoice.lease.room.name}` : ""}
              </Link>
            ) : (
              <p className="text-sm text-muted">Dokument jednorazowy, bez umowy.</p>
            )}

            {invoice.periodStart ? (
              <p className="text-xs text-muted">
                Okres: {shortDate.format(invoice.periodStart)}
                {invoice.periodEnd ? ` – ${shortDate.format(invoice.periodEnd)}` : ""}
              </p>
            ) : null}

            {invoice.lease ? (
              <Link
                href={`/panel/umowy/${invoice.lease.id}`}
                className="mt-1 w-fit text-xs text-accent hover:underline"
              >
                Zobacz umowę
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col p-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="flex-1">Pozycja</span>
            <span className="w-20 text-right">Ilość</span>
            <span className="w-14 text-right">VAT</span>
            <span className="w-24 text-right">Netto</span>
            <span className="w-24 text-right">Brutto</span>
          </div>

          {invoice.lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-0 flex-1 text-fg">{line.description}</span>
              <span className="tabular w-20 text-right font-mono text-xs text-muted">
                {Number(line.quantity)
                  .toString()
                  .replace(".", ",")}{" "}
                {line.unit}
              </span>
              <span className="w-14 text-right text-xs text-muted">{VAT_LABEL[line.vatRate]}</span>
              <span className="tabular w-24 text-right font-mono text-xs text-muted">
                {formatPLN(line.netGrosze)}
              </span>
              <span className="tabular w-24 text-right font-mono text-fg">
                {formatPLN(line.grossGrosze)}
              </span>
            </div>
          ))}

          <div className="flex flex-col gap-1 border-t border-border bg-surface-alt px-4 py-3">
            <SummaryRow label="Razem netto" value={formatPLN(invoice.totalNetGrosze)} />
            <SummaryRow label="Razem VAT" value={formatPLN(invoice.totalVatGrosze)} />
            <SummaryRow label="Do zapłaty" value={formatPLN(invoice.totalGrossGrosze)} strong />
            {invoice.paidGrosze > 0 ? (
              <>
                <SummaryRow label="Wpłacono" value={formatPLN(invoice.paidGrosze)} />
                <SummaryRow label="Pozostaje" value={formatPLN(remaining)} strong />
              </>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              Słownie: {groszeToPolishWords(invoice.totalGrossGrosze)}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-fg">
          Wpłaty <span className="font-normal text-muted">({invoice.payments.length})</span>
        </h2>

        {invoice.payments.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              Nie odnotowano jeszcze żadnej wpłaty.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {invoice.payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">
                      {shortDate.format(payment.paidAt)} · {PAYMENT_METHOD_LABEL[payment.method]}
                    </p>
                    {payment.reference ? (
                      <p className="text-xs text-muted">{payment.reference}</p>
                    ) : null}
                  </div>
                  <p className="tabular font-mono text-sm text-fg">
                    {formatPLN(payment.amountGrosze)}
                  </p>
                  <DeletePayment paymentId={payment.id} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {lastNotification ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex items-start gap-2.5 p-4">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 text-xs">
              <p className="font-medium text-fg">
                {lastNotification.status === "SENT"
                  ? `Wysłano przypomnienie ${shortDate.format(lastNotification.createdAt)}`
                  : `Nie udało się wysłać przypomnienia ${shortDate.format(lastNotification.createdAt)}`}
              </p>
              <p className="text-muted">
                {lastNotification.toEmail}
                {lastNotification.error ? ` — ${lastNotification.error}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {invoice.status !== "CANCELLED" ? (
        <div className="flex flex-col gap-3">
          <SendInvoice
            invoiceId={invoice.id}
            tenantEmail={invoice.lease?.tenants[0]?.tenant.email ?? null}
            hasLease={Boolean(invoice.lease?.tenants[0])}
          />
          {remaining > 0 ? (
            <RecordPayment invoiceId={invoice.id} remainingGrosze={remaining} />
          ) : null}
          <CancelInvoice invoiceId={invoice.id} />
        </div>
      ) : null}

      {invoice.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="text-[13px] font-semibold text-fg">Uwagi</p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{invoice.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? "font-semibold text-fg" : "text-muted"}>{label}</span>
      <span className={`tabular font-mono ${strong ? "font-semibold text-fg" : "text-muted"}`}>
        {value}
      </span>
    </div>
  );
}

async function getLastNotification(invoiceId: string) {
  return prisma.notification.findFirst({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true, toEmail: true, error: true },
  });
}

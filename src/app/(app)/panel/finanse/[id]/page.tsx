import { Banknote, CalendarDays, Clock, Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { SectionCard } from "@/components/panel/section-card";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { CancelledInvoiceActions } from "@/components/panel/invoices/cancelled-invoice-actions";
import { DraftInvoiceEditor } from "@/components/panel/invoices/draft-invoice-editor";
import { InvoiceMenu, type InvoiceSummary } from "@/components/panel/invoices/invoice-menu";
import { DeletePayment, RecordPayment } from "@/components/panel/invoices/record-payment";
import { SendInvoice } from "@/components/panel/invoices/send-invoice";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import {
  getInvoice,
  invoiceDeliveryHistory,
  mayRenumberInvoices,
  suggestedDraftNumber,
} from "@/lib/invoices/service";
import { invoiceNumberEditable } from "@/lib/invoices/renumber";
import { hasRegisterNumber } from "@/lib/invoices/draft";
import { invoicePdfFilename } from "@/lib/invoices/pdf-data";
import { paidPercent, remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { vatLabels } from "@/lib/invoices/vat";
import { fill, formatDateIn, formatDayRangeIn, formatNumber } from "@/lib/i18n/format";
import { formatAmount, formatMoney } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { isSellerComplete } from "@/lib/organizations/service";
import { invoiceKindLabels, paymentMethodLabels } from "@/lib/validations/invoice";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const invoice = await getInvoice(session.user.organizationId, id);
  const d = await panelDictionary();

  if (!invoice) return { title: d.panel.panelMisc.meta.document };
  return {
    title: hasRegisterNumber(invoice.number) ? invoice.number : d.panel.invoices.draftNumber,
  };
}

/**
 * Karta dokumentu (redesign/14-dokument-karta-desktop.svg i -mobile.svg).
 *
 * Po lewej „kartka" — to, co jest na wydruku: nabywca, czego dotyczy,
 * pozycje i suma. Po prawej stan rozliczenia: ile zostało, pasek spłaty,
 * wpłaty i historia wiadomości. Na telefonie rozliczenie idzie pierwsze,
 * bo po to się tu zagląda.
 */
export default async function InvoiceDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.financePage.detail;
  const session = await requireOwnerSession();
  const organizationId = session.user.organizationId;
  const { id } = await params;

  const invoice = await getInvoice(organizationId, id);
  if (!invoice) notFound();

  const now = new Date();
  const status = resolveInvoiceStatus(invoice, now);
  const remaining = remainingGrosze(invoice);

  const property = invoice.lease?.property;
  const isDraft = invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";
  const numbered = hasRegisterNumber(invoice.number);
  const displayNumber = numbered ? invoice.number : d.panel.invoices.draftNumber;
  const kindLabel = invoiceKindLabels(d)[invoice.kind];

  /*
    Własny numer — wyjątek dla kont, które numerację prowadzą też gdzie indziej.
    Patrz `lib/invoices/renumber.ts`; ten sam warunek pilnuje endpoint, bo ukryty
    przycisk nie jest bramką. Szkic dostaje pole na numer w swoim edytorze,
    wystawiony — pozycję w menu „⋯".
  */
  const mayRenumber = invoiceNumberEditable(invoice) && (await mayRenumberInvoices(organizationId));
  const canEditNumber = !isDraft && mayRenumber;
  const suggestedNumber =
    isDraft && mayRenumber ? await suggestedDraftNumber(organizationId, invoice) : null;

  const { notifications, awaitingSend } = await invoiceDeliveryHistory(organizationId, invoice);

  const summary: InvoiceSummary = {
    id: invoice.id,
    number: displayNumber,
    amount: formatMoney(invoice.totalGrossGrosze, locale),
    buyerName: invoice.buyerName,
  };
  const firstTenant = invoice.lease?.tenants[0]?.tenant ?? null;

  const pdfButton = (
    <Button asChild variant="secondary" className="flex-1 lg:flex-none">
      {/* target="_blank": PDF otwiera się w podglądzie, a widok dokumentu zostaje. */}
      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
        <Download className="size-[18px]" aria-hidden />
        {t.pdf}
      </a>
    </Button>
  );

  const period = invoice.periodStart
    ? invoice.periodEnd
      ? formatDayRangeIn(invoice.periodStart, invoice.periodEnd, locale)
      : formatDateIn(invoice.periodStart, locale, "short")
    : null;

  // Ostrzeżenie stoi tutaj, a nie tylko w ustawieniach: to jest moment,
  // w którym za chwilę pobierzesz PDF i wyślesz go najemcy.
  const sellerAlert = !isSellerComplete(invoice.organization) ? (
    <Alert
      tone="warning"
      action={
        <Link href="/panel/ustawienia" className="hover:underline">
          {t.completeInSettings}
        </Link>
      }
    >
      {t.sellerIncomplete}
    </Alert>
  ) : null;

  // Szkic to formularz z własnym nagłówkiem i akcjami (redesign/14-dokument-szkic.svg).
  if (isDraft) {
    return (
      <div className="mx-auto flex w-full max-w-[1096px] flex-col">
        <DraftInvoiceEditor
          back={{ href: "/panel/finanse", label: d.panel.financePage.title }}
          meta={[invoice.buyerName, property ? `${property.name}${invoice.lease?.room ? `, ${invoice.lease.room.name}` : ""}` : null]
            .filter(Boolean)
            .join(", ")}
          alerts={sellerAlert}
          invoice={{
            id: invoice.id,
            kind: invoice.kind,
            buyerName: invoice.buyerName,
            amount: formatMoney(invoice.totalGrossGrosze, locale),
            issueDate: dateField(invoice.issueDate),
            saleDate: dateField(invoice.saleDate),
            dueDate: dateField(invoice.dueDate),
            periodStart: invoice.periodStart ? dateField(invoice.periodStart) : null,
            periodEnd: invoice.periodEnd ? dateField(invoice.periodEnd) : null,
            hasLease: invoice.leaseId !== null,
            notes: invoice.notes,
            lines: invoice.lines.map((line) => ({
              description: line.description,
              quantity: Number(line.quantity),
              unit: line.unit,
              unitPriceNetGrosze: line.unitPriceNetGrosze,
              vatRate: line.vatRate,
            })),
          }}
          suggestedNumber={suggestedNumber}
        />
      </div>
    );
  }

  // Kwota „Pozostaje" w kolorze stanu: czerwień po terminie, zieleń po spłacie.
  const remainingTone =
    remaining === 0 ? "text-good" : status === "OVERDUE" ? "text-bad" : "text-fg";

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/finanse", label: d.panel.financePage.title }}
        title={`${kindLabel} ${displayNumber}`}
        badges={<InvoiceStatusBadge status={status} d={d} due={{ date: invoice.dueDate, now, locale }} />}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-subtle" aria-hidden />
              {fill(t.issued, { date: formatDateIn(invoice.issueDate, locale, "short") })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-subtle" aria-hidden />
              {fill(t.due, { date: formatDateIn(invoice.dueDate, locale, "short") })}
            </span>
            {invoice.lease ? (
              <Link
                href={`/panel/umowy/${invoice.lease.id}`}
                className="flex items-center gap-1.5 font-[550] text-accent hover:underline"
              >
                <FileText className="size-4 text-subtle" aria-hidden />
                {invoice.lease.number ? fill(t.lease, { number: invoice.lease.number }) : t.viewLease}
              </Link>
            ) : null}
          </>
        }
        actions={
          isCancelled ? (
            <>
              {pdfButton}
              <CancelledInvoiceActions invoice={summary} isDraft={!numbered} />
            </>
          ) : (
            <>
              <InvoiceMenu invoice={summary} canEditNumber={canEditNumber} />
              {pdfButton}
              <SendInvoice
                invoiceId={invoice.id}
                tenant={
                  firstTenant
                    ? {
                        id: firstTenant.id,
                        name: `${firstTenant.firstName} ${firstTenant.lastName}`,
                        email: firstTenant.email,
                      }
                    : null
                }
                hasLease={Boolean(firstTenant)}
                attachmentName={invoicePdfFilename(invoice)}
                className="flex-1 lg:flex-none"
              />
              {remaining > 0 ? (
                <RecordPayment
                  invoiceId={invoice.id}
                  remainingGrosze={remaining}
                  description={`${displayNumber}, ${invoice.buyerName}`}
                  className="order-first h-12 w-full text-[15px] lg:order-none lg:h-10 lg:w-auto lg:text-sm"
                />
              ) : null}
            </>
          )
        }
      />

      {sellerAlert}

      {/* Zatwierdzony szkic czeka na wysyłkę z panelu — automat go nie wyśle. */}
      {awaitingSend && !isCancelled ? <Alert tone="info">{d.panel.financePage.send.awaiting}</Alert> : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,352px)] lg:grid-rows-[auto_1fr]">
        {/* Rozliczenie: na telefonie pierwsze, na desktopie w prawej kolumnie. */}
        {!isCancelled ? (
          <section className="flex flex-col rounded-tile border border-border bg-surface p-5 lg:col-start-2 lg:row-start-1 lg:p-6">
            <h2 className="text-sm font-[550] text-muted">{t.remaining}</h2>
            <MoneyDisplay
              grosze={remaining}
              locale={locale}
              className={cn("mt-2 text-[34px] leading-10 tracking-[-0.8px]", remainingTone)}
            />
            <span
              className="mt-4 block h-2 overflow-hidden rounded-full bg-surface-alt"
              role="progressbar"
              aria-label={t.paid}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={paidPercent(invoice)}
            >
              <span
                className="block h-full rounded-full bg-good"
                style={{ width: `${paidPercent(invoice)}%` }}
              />
            </span>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">{t.paid}</span>
              <span className="font-mono text-sm font-semibold whitespace-nowrap text-fg">
                {formatMoney(invoice.paidGrosze, locale)}
              </span>
            </div>

            <div className="mt-4 border-t border-border pt-2">
              {invoice.payments.length === 0 ? (
                <div className="flex min-h-11 items-center gap-2.5">
                  <Banknote className="size-[18px] shrink-0 text-subtle" aria-hidden />
                  <span className="flex-1 text-sm text-muted">{d.panel.financePage.payment.none}</span>
                  {remaining > 0 ? (
                    <RecordPayment
                      invoiceId={invoice.id}
                      remainingGrosze={remaining}
                      description={`${displayNumber}, ${invoice.buyerName}`}
                      trigger="link"
                    />
                  ) : null}
                </div>
              ) : (
                <>
                  <h3 className="sr-only">{t.payments}</h3>
                  <ul className="flex flex-col">
                    {invoice.payments.map((payment) => (
                      <li key={payment.id} className="flex min-h-12 items-center gap-3 py-1.5">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-[550] text-fg">
                            {formatDateIn(payment.paidAt, locale, "short")}
                            <span className="font-normal text-muted">
                              {" · "}
                              {paymentMethodLabels(d)[payment.method]}
                            </span>
                          </span>
                          {payment.reference ? (
                            <span className="truncate text-[12.5px] text-muted">{payment.reference}</span>
                          ) : null}
                        </span>
                        <span className="font-mono text-sm font-semibold whitespace-nowrap text-fg">
                          {formatMoney(payment.amountGrosze, locale)}
                        </span>
                        <DeletePayment paymentId={payment.id} />
                      </li>
                    ))}
                  </ul>
                  {remaining > 0 ? (
                    <div className="flex justify-end pt-1">
                      <RecordPayment
                        invoiceId={invoice.id}
                        remainingGrosze={remaining}
                        description={`${displayNumber}, ${invoice.buyerName}`}
                        trigger="link"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* „Kartka" dokumentu i uwagi. */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <article className="flex flex-col rounded-tile border border-border bg-surface">
            <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:grid-cols-2 lg:px-7 lg:py-7">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="mb-1 text-[12.5px] font-medium text-subtle">{t.buyer}</h2>
                <p className="text-sm font-semibold text-fg">{invoice.buyerName}</p>
                {invoice.buyerStreet ? <p className="text-sm text-muted">{invoice.buyerStreet}</p> : null}
                {invoice.buyerPostalCode || invoice.buyerCity ? (
                  <p className="text-sm text-muted">
                    {[invoice.buyerPostalCode, invoice.buyerCity].filter(Boolean).join(" ")}
                  </p>
                ) : null}
                {invoice.buyerTaxId ? (
                  <p className="font-mono text-sm text-muted">NIP {invoice.buyerTaxId}</p>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="mb-1 text-[12.5px] font-medium text-subtle">{t.subject}</h2>
                {property ? (
                  <Link
                    href={`/panel/nieruchomosci/${property.id}`}
                    className="w-fit text-sm font-semibold text-fg hover:text-accent hover:underline"
                  >
                    {property.name}
                    {invoice.lease?.room ? `, ${invoice.lease.room.name}` : ""}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-fg">{t.oneOff}</p>
                )}
                {period ? <p className="text-sm text-muted">{fill(t.period, { period })}</p> : null}
              </div>
            </div>

            <div className="border-t border-border px-5 lg:px-7">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[12.5px] font-[550] text-muted">
                    <th scope="col" className="py-3.5 font-[550]">{t.lineHeader}</th>
                    <th scope="col" className="hidden py-3.5 pl-4 text-right font-[550] sm:table-cell">{t.quantity}</th>
                    <th scope="col" className="hidden py-3.5 pl-4 text-right font-[550] sm:table-cell">{t.net}</th>
                    <th scope="col" className="hidden py-3.5 pl-4 text-right font-[550] sm:table-cell">{t.vat}</th>
                    <th scope="col" className="py-3.5 pl-4 text-right font-[550]">{t.gross}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="py-4 text-fg">{line.description}</td>
                      <td className="hidden py-4 pl-4 text-right font-mono whitespace-nowrap text-muted sm:table-cell">
                        {formatNumber(Number(line.quantity), locale)} {line.unit}
                      </td>
                      <td className="hidden py-4 pl-4 text-right font-mono whitespace-nowrap text-muted sm:table-cell">
                        {formatAmount(line.netGrosze, locale)}
                      </td>
                      <td className="hidden py-4 pl-4 text-right whitespace-nowrap text-muted sm:table-cell">
                        {vatLabels(d)[line.vatRate]}
                      </td>
                      <td className="py-4 pl-4 text-right font-mono font-semibold whitespace-nowrap text-fg">
                        {formatMoney(line.grossGrosze, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <dl className="flex flex-col gap-1.5 border-t border-border py-5">
                <TotalRow label={t.totalNet} value={formatMoney(invoice.totalNetGrosze, locale)} />
                <TotalRow label={t.totalVat} value={formatMoney(invoice.totalVatGrosze, locale)} />
                <div className="mt-3 flex items-baseline justify-between gap-4 sm:justify-end sm:gap-12">
                  <dt className="text-[15px] font-semibold text-fg">{t.totalDue}</dt>
                  <dd className="font-mono text-xl font-[650] tracking-[-0.4px] whitespace-nowrap text-fg sm:text-2xl">
                    {formatMoney(invoice.totalGrossGrosze, locale)}
                  </dd>
                </div>
              </dl>

              {t.inWords ? (
                <p className="pb-5 text-[13px] text-subtle">
                  {t.inWords}
                  {groszeToPolishWords(invoice.totalGrossGrosze)}
                </p>
              ) : null}
            </div>
          </article>

          {invoice.notes ? (
            <SectionCard title={t.notes}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{invoice.notes}</p>
            </SectionCard>
          ) : null}
        </div>

        {/* Historia wiadomości o dokumencie: wysyłka, przypomnienia, wezwania. */}
        {notifications.length > 0 ? (
          <SectionCard title={t.history} className="lg:col-start-2 lg:row-start-2">
            <ol className="flex flex-col">
              {notifications.map((notification, index) => {
                const failed = notification.status === "FAILED";
                return (
                  <li key={notification.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < notifications.length - 1 ? (
                      <span className="absolute top-5 bottom-0 left-[4.5px] w-px bg-border-strong" aria-hidden />
                    ) : null}
                    <span
                      className={cn(
                        "mt-1.5 size-2.5 shrink-0 rounded-full",
                        failed ? "bg-bad" : notification.status === "SENT" ? "bg-good" : "bg-subtle",
                      )}
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-[550] text-fg">
                          {d.panel.tenantsPage.detail.notificationTypes[notification.type]}
                        </span>
                        <span className="shrink-0 font-mono text-[13px] text-muted">
                          {formatDateIn(notification.createdAt, locale, "dayMonth")}
                        </span>
                      </div>
                      {failed ? (
                        <span className="text-[12.5px] font-[550] text-bad">
                          {d.panel.tenantsPage.detail.sendFailed}
                          {notification.error ? `: ${notification.error}` : ""}
                        </span>
                      ) : null}
                      {notification.toEmail ? (
                        <span className="truncate text-[12.5px] text-muted">{notification.toEmail}</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

/** Data z bazy → wartość pola daty („2026-10-01"). Daty dokumentu są w UTC. */
function dateField(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 sm:justify-end sm:gap-12">
      <dt className="text-[13.5px] text-muted">{label}</dt>
      <dd className="font-mono text-sm whitespace-nowrap text-fg sm:min-w-32 sm:text-right">{value}</dd>
    </div>
  );
}

import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  FileText,
  NotebookPen,
  Pencil,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import { ActivateLease } from "@/components/panel/leases/activate-lease";
import { BillingStartField } from "@/components/panel/leases/billing-start-field";
import { EmailDeliveryToggle } from "@/components/panel/leases/email-delivery-toggle";
import { ExtendLease } from "@/components/panel/leases/extend-lease";
import { TerminateLease } from "@/components/panel/leases/terminate-lease";
import { PageHeader } from "@/components/panel/page-header";
import { CardRows, DataItem, SectionCard } from "@/components/panel/section-card";
import { InvoiceStatusBadge, LeaseStatusBadge } from "@/components/panel/status-badges";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { hasRegisterNumber } from "@/lib/invoices/draft";
import { resolveInvoiceStatus } from "@/lib/invoices/status";
import { leaseExpiryLabel, resolveLeaseExpiry } from "@/lib/leases/expiry";
import { getLease } from "@/lib/leases/service";
import { leaseMonthlySummary, leasePeriodProgress } from "@/lib/leases/summary";
import { formatMoney } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn, initials } from "@/lib/utils";
import { utilitiesModeIncomplete, utilitiesModeLabels } from "@/lib/validations/lease";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const lease = await getLease(session.user.organizationId, id);

  const t = (await panelDictionary()).panel;

  return {
    title: lease?.number
      ? fill(t.leasesPage.detail.numbered, { number: lease.number })
      : t.panelMisc.meta.lease,
  };
}

export default async function LeaseDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.leasesPage.detail;
  const misc = d.panel.panelMisc;
  const session = await requireOwnerSession();
  const { id } = await params;

  const lease = await getLease(session.user.organizationId, id);
  if (!lease) notFound();

  const now = new Date();
  const canTerminate =
    lease.status === "ACTIVE" || lease.status === "DRAFT" || lease.status === "RESERVED";

  // Przedłużać jest co tylko wtedy, gdy umowa ma koniec i jeszcze trwa —
  // przy bezterminowej nie ma czego przesuwać, a po wypowiedzeniu nowa data
  // końca niczego nie wskrzesi.
  const canExtend = Boolean(lease.endDate) && canTerminate && !lease.terminatedAt;
  const expiry = resolveLeaseExpiry(lease.endDate, now);
  const monthly = leaseMonthlySummary(lease);
  const progress = leasePeriodProgress(lease.startDate, lease.endDate, now);

  const unitLabel = `${lease.property.name}${lease.room ? `, ${lease.room.name}` : ""}`;
  const period = `${formatDateIn(lease.startDate, locale, "short")} - ${
    lease.endDate ? formatDateIn(lease.endDate, locale, "short") : t.openEnded
  }`;
  const documentUnavailable = d.panel.leases.leaseDocument.unavailable;
  const incomplete = utilitiesModeIncomplete(d)[lease.utilitiesMode];

  const pdfLink = documentUnavailable ? null : (
    /* target="_blank": PDF otwiera się w podglądzie, a użytkownik nie traci
       widoku umowy. */
    <a href={`/api/leases/${lease.id}/pdf`} target="_blank" rel="noopener noreferrer">
      <Download className="size-[18px]" aria-hidden />
      {d.panel.leases.leaseDocument.download}
    </a>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/umowy", label: d.panel.leasesPage.title }}
        title={lease.number ? fill(t.numbered, { number: lease.number }) : t.untitled}
        badges={
          <>
            <LeaseStatusBadge status={lease.status} d={d} />
            {/* Odliczanie na karcie umowy, nie tylko przy najemcy: to tutaj
                właściciel trafia, gdy ma zdecydować o przedłużeniu. */}
            {expiry ? (
              <Badge tone={expiry.tone === "neutral" ? "neutral" : expiry.tone} icon={Clock}>
                {leaseExpiryLabel(expiry, locale, d.panel.leasesPage.expiry)}
              </Badge>
            ) : null}
          </>
        }
        meta={
          <>
            <Link
              href={`/panel/nieruchomosci/${lease.property.id}`}
              className="flex items-center gap-1.5 font-[550] text-accent hover:underline"
            >
              <Building2 className="size-4 text-subtle" aria-hidden />
              {unitLabel}
            </Link>
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-subtle" aria-hidden />
              {lease.tenants.map(({ tenant }, index) => (
                <span key={tenant.id}>
                  <Link href={`/panel/najemcy/${tenant.id}`} className="font-[550] text-accent hover:underline">
                    {tenant.firstName} {tenant.lastName}
                  </Link>
                  {index < lease.tenants.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <CalendarDays className="size-4 text-subtle" aria-hidden />
              {period}
            </span>
          </>
        }
        actions={
          <>
            {/* Archiwizacja dopiero po zakończeniu umowy — aktywna zajmuje
                jednostkę, więc schowana z listy zostawiłaby lokal zablokowany
                bez śladu. */}
            {lease.status !== "ACTIVE" ? (
              <ArchiveAction
                endpoint="/api/leases"
                id={lease.id}
                archived={lease.archivedAt !== null}
                label={t.archiveLabel}
                hint={t.archiveHint}
              />
            ) : null}
            {pdfLink ? (
              <Button asChild variant="secondary">
                {pdfLink}
              </Button>
            ) : null}
            <Button asChild variant={canExtend ? "secondary" : "primary"}>
              <Link href={`/panel/umowy/${lease.id}/edytuj`}>
                <Pencil className="size-[18px]" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>
            {canExtend && lease.endDate ? (
              <ExtendLease leaseId={lease.id} endDate={lease.endDate.toISOString().slice(0, 10)} />
            ) : null}
          </>
        }
      />

      {/*
        Wzór umowy jest napisany pod polskie prawo, więc w wersji, która go nie
        obsługuje, przycisku nie ma — zamiast wypuścić dokument mówiący
        najemcy nieprawdę o jego prawach, mówimy wprost, czego brakuje.
      */}
      {documentUnavailable ? <Alert tone="info">{documentUnavailable}</Alert> : null}

      {lease.status === "DRAFT" || lease.status === "RESERVED" ? (
        <ActivateLease leaseId={lease.id} status={lease.status} />
      ) : null}

      {/* Ostrzeżenie zostaje na karcie umowy, nie tylko w formularzu: umowę
          zakłada się raz, a rozliczenia wystawia co miesiąc. */}
      {incomplete ? <Alert tone="warning">{incomplete}</Alert> : null}

      {lease.terminatedAt ? (
        <Alert tone="error">
          <span className="block font-semibold">
            {fill(misc.leaseTerminatedOn, { date: formatDateIn(lease.terminatedAt, locale, "short") })}
          </span>
          {lease.terminationNote ? <span className="block font-normal">{lease.terminationNote}</span> : null}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Warunki finansowe: miesięczna kwota dużą liczbą, rozbicie paskiem. */}
          <section className="flex flex-col gap-5 rounded-tile border border-border bg-surface p-5 lg:p-7">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-[550] text-muted">{misc.monthly}</h2>
              <MoneyDisplay
                grosze={monthly.totalGrosze}
                locale={locale}
                className="text-[34px] leading-none tracking-[-0.8px] text-fg lg:text-[42px] lg:tracking-[-1.1px]"
                currencyClassName="text-muted"
              />
            </div>

            {monthly.utilitiesGrosze > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
                  <span className="h-full rounded-full bg-accent" style={{ width: `${monthly.rentPercent}%` }} />
                  <span className="h-full flex-1 rounded-full bg-chart-2" />
                </div>
                <dl className="grid gap-2 sm:grid-cols-2 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden />
                    <dt className="flex-1 text-[13.5px] text-muted">{t.rent}</dt>
                    <dd className="font-mono text-sm font-semibold text-fg">{formatMoney(monthly.rentGrosze, locale)}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-[3px] bg-chart-2" aria-hidden />
                    <dt className="flex-1 text-[13.5px] text-muted">{t.utilitiesAdvance}</dt>
                    <dd className="font-mono text-sm font-semibold text-fg">
                      {formatMoney(monthly.utilitiesGrosze, locale)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-2">
              <DataItem label={t.deposit}>
                <span className="font-mono">{formatMoney(lease.depositGrosze, locale)}</span>
              </DataItem>
              <DataItem label={t.utilities}>{utilitiesModeLabels(d)[lease.utilitiesMode]}</DataItem>
              <DataItem label={t.billingDay}>{fill(t.billingDayValue, { day: lease.billingDay })}</DataItem>
              <DataItem label={t.paymentTerm}>
                {fill(t.paymentTermValue, { days: lease.paymentTermDays })}
              </DataItem>
              {/* Wiersz stoi zawsze, także bez ustalonego okresu: „terminy
                  ustawowe" to odpowiedź na pytanie o wypowiedzenie, a brak
                  wiersza wyglądałby jak niedokończona umowa. */}
              <DataItem label={t.noticePeriod}>
                {lease.noticePeriodMonths === null
                  ? t.noticePeriodStatutory
                  : `${lease.noticePeriodMonths} ${pluralize(locale, lease.noticePeriodMonths, t.noticeMonths)}`}
              </DataItem>
              <BillingStartField
                leaseId={lease.id}
                billingStartsAt={lease.billingStartsAt?.toISOString().slice(0, 10) ?? ""}
              />
            </dl>

            {/* Kwota słownie jest wymogiem polskiej umowy; w wersji, która jej
                nie zna, słownik zostawia pusty tekst i wiersz nie powstaje. */}
            {t.inWords ? (
              <p className="text-[13px] text-subtle">
                {t.inWords}: {groszeToPolishWords(lease.rentGrosze)}
              </p>
            ) : null}
          </section>

          {lease.notes ? (
            <SectionCard title={t.extras} icon={NotebookPen}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{lease.notes}</p>
            </SectionCard>
          ) : null}

          {/* Naliczanie i wystawianie siedzą w profilu najemcy: rozliczamy
              człowieka, a nie umowę — ten sam najemca miewa dwie umowy. */}
          <SectionCard
            title={t.invoices}
            count={lease.invoices.length > 0 ? lease.invoices.length : undefined}
          >
            {lease.invoices.length === 0 ? (
              <p className="py-2 text-sm text-muted">
                {fill(misc.noInvoicesYet, { day: lease.billingDay })}
                {/* Bez tego dopisku pusta lista wygląda jak awaria naliczania,
                    a jest dokładnie tym, o co poprosił właściciel. */}
                {lease.billingStartsAt
                  ? fill(misc.noInvoicesBefore, {
                      date: formatDateIn(lease.billingStartsAt, locale, "long"),
                    })
                  : ""}
              </p>
            ) : (
              <CardRows>
                {lease.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/panel/finanse/${invoice.id}`}
                      className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold text-fg">
                          {hasRegisterNumber(invoice.number) ? invoice.number : d.panel.invoices.draftNumber}
                        </span>
                        <span className="block text-[13px] text-muted">
                          {fill(misc.dueOn, { date: formatDateIn(invoice.dueDate, locale, "short") })}
                          {invoice.payments.length > 0
                            ? `, ${invoice.payments.length} ${pluralize(locale, invoice.payments.length, misc.paymentsCount)}`
                            : ""}
                        </span>
                      </span>
                      <InvoiceStatusBadge status={resolveInvoiceStatus(invoice, now)} d={d} />
                      <span className="w-28 text-right font-mono text-sm font-semibold whitespace-nowrap text-fg">
                        {formatMoney(invoice.totalGrossGrosze, locale)}
                      </span>
                      <ChevronRight
                        className="hidden size-[18px] text-subtle transition-colors group-hover:text-fg sm:block"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </CardRows>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          {progress ? (
            <section className="flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:p-6">
              <h2 className="text-sm font-[550] text-muted">{misc.leasePeriod}</h2>
              <div className="flex items-center justify-between gap-3 font-mono text-[15px] font-semibold text-fg">
                <span>{formatDateIn(lease.startDate, locale, "short")}</span>
                <span>{lease.endDate ? formatDateIn(lease.endDate, locale, "short") : ""}</span>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
                <span
                  className={cn(
                    "block h-full rounded-full",
                    expiry?.tone === "critical" ? "bg-bad" : expiry?.tone === "warning" ? "bg-warn" : "bg-accent",
                  )}
                  style={{ width: `${progress.percent}%` }}
                />
              </span>
              {progress.daysLeft >= 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">{misc.remaining}</span>
                  <span
                    className={cn(
                      "text-sm font-[650]",
                      expiry?.tone === "critical" ? "text-bad-ink" : expiry?.tone === "warning" ? "text-warn-ink" : "text-fg",
                    )}
                  >
                    {progress.daysLeft} {pluralize(locale, progress.daysLeft, d.panel.leasesPage.expiry.days)}
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}

          <SectionCard
            title={lease.tenants.length > 1 ? t.tenants : t.tenant}
            count={lease.tenants.length > 1 ? lease.tenants.length : undefined}
          >
            <CardRows>
              {lease.tenants.map(({ tenant, isPrimary }) => {
                const name = `${tenant.firstName} ${tenant.lastName}`;

                return (
                  <li key={tenant.id}>
                    <Link href={`/panel/najemcy/${tenant.id}`} className="flex items-center gap-3 py-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13.5px] font-semibold text-accent"
                        aria-hidden
                      >
                        {initials(name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-fg">{name}</span>
                        {tenant.phone ? (
                          <span className="block font-mono text-[13px] text-muted">{tenant.phone}</span>
                        ) : null}
                      </span>
                      {isPrimary && lease.tenants.length > 1 ? <Badge tone="accent">{t.primary}</Badge> : null}
                    </Link>
                  </li>
                );
              })}
            </CardRows>
          </SectionCard>

          <section className="flex flex-col rounded-tile border border-border bg-surface lg:rounded-card">
            <div className="px-4 py-4 lg:px-6">
              <EmailDeliveryToggle leaseId={lease.id} enabled={lease.sendInvoicesByEmail} />
            </div>
            {pdfLink ? (
              <a
                href={`/api/leases/${lease.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border-t border-border px-4 py-4 lg:px-6"
              >
                <FileText className="size-[18px] shrink-0 text-subtle" aria-hidden />
                <span className="flex-1 text-[14.5px] font-semibold text-fg">{misc.leasePdf}</span>
                <span className="text-[13.5px] font-semibold text-accent">{misc.download}</span>
              </a>
            ) : null}
          </section>

          {canTerminate && !lease.terminatedAt ? (
            <div className="flex">
              <TerminateLease
                leaseId={lease.id}
                unitLabel={unitLabel}
                tenantCount={lease.tenants.length}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

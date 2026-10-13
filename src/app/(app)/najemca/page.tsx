import { AlertCircle, CheckCircle2, Download, FileText, Home, Link2, Lock, LogOut, Mail } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(app)/actions";
import { LogoMark } from "@/components/brand/logo";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireSession } from "@/lib/auth/session";
import { formatBankAccount } from "@/lib/bank-account";
import { organizationAllows } from "@/lib/billing/server";
import { ROUTES } from "@/lib/auth/routes";
import { fill, formatDateIn, monthNames } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { formatPropertyAddress } from "@/lib/properties/address";
import { getTenantPortal } from "@/lib/tenants/portal";
import { utilitiesModeLabels } from "@/lib/validations/lease";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { requestLocale } from "@/lib/i18n/server";
import { tenantPortalLocale } from "@/lib/panel/dictionary";
import { cn, initials } from "@/lib/utils";

/**
 * Tytuł karty w języku wynajmującego — tego samego, w którym najemca ogląda
 * resztę portalu. Sesji tu nie ma, więc bierzemy preferencję z żądania;
 * rozjazd dotyczy wyłącznie tytułu karty i naprawia się po pierwszym wejściu.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await requestLocale()).panel.tenantPortal.title };
}

/**
 * Panel najemcy — widok tylko do odczytu (redesign/21-portal-najemcy-*.svg).
 *
 * Adres, na który `landingPathForRole()` odsyła konta z rolą TENANT.
 * Osobny, prosty układ zamiast layoutu panelu właściciela: najemca ma jedną
 * stronę i nawigacja boczna z Nieruchomościami czy Raportami byłaby dla niego
 * bez sensu — a część pozycji prowadziłaby do danych, których nie ma prawa
 * zobaczyć. Na górze dwie rzeczy, po które się tu wchodzi: ile zapłacić
 * i na jakie konto.
 */
export default async function TenantPortalPage() {
  const session = await requireSession(ROUTES.tenantDashboard);

  // Właściciel, który trafił tu z zakładki, wraca do swojego panelu.
  if (session.user.role !== "TENANT") redirect(ROUTES.ownerDashboard);

  const portal = await getTenantPortal(session.user.id);

  /*
    Portal jest funkcją planu wynajmującego, więc po zejściu z planu strona
    musi powiedzieć to wprost. Wylogowanie najemcy albo pusta strona kazałyby
    mu szukać przyczyny u siebie — a przyczyna leży po drugiej stronie umowy.
  */
  const portalAllowed = portal ? await organizationAllows(portal.landlord.id, "TENANT_PORTAL") : true;

  /*
    Język bierze się z organizacji wynajmującego, a nie z ciasteczka najemcy:
    to jego najem, jego dokumenty i jego kwoty najemca tu ogląda, a wersję
    krajową konta wybrał wynajmujący, nie odwiedzający.
  */
  const locale = tenantPortalLocale(portal?.landlord.locale);
  const d = getDictionary(locale);
  const t = d.panel.tenantPortal;
  const now = new Date();
  const months = monthNames(locale);

  const writeToLandlord = portal?.landlord.contactEmail ? (
    <Button asChild variant="secondary">
      <a href={`mailto:${portal.landlord.contactEmail}`}>
        <Mail className="size-[18px]" aria-hidden />
        {t.writeToLandlord}
      </a>
    </Button>
  ) : undefined;

  let body: React.ReactNode;

  if (portal && !portalAllowed) {
    body = <EmptyState icon={Lock} title={t.unavailableTitle} action={writeToLandlord} />;
  } else if (!portal) {
    // Konto istnieje, ale nie jest powiązane z żadnym profilem najemcy.
    // Nie zgadujemy po adresie e-mail — powiązanie robi właściciel.
    body = <EmptyState icon={Link2} title={t.notLinkedTitle} />;
  } else {
    const lease = portal.leases[0] ?? null;
    const next = portal.nextPayment;
    const overdue = next?.displayStatus === "OVERDUE";
    const owes = portal.outstandingGrosze > 0;

    body = (
      <>
        <h1 className="r-display text-[28px] leading-9 text-fg lg:text-[32px] lg:leading-10">
          {fill(d.panel.panelMisc.tenantPortalGreeting, { name: portal.tenant.firstName })}
        </h1>

        {lease ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            {/* Do zapłaty: suma wszystkich nieopłaconych, termin najstarszego. */}
            <section
              className={cn(
                "flex flex-col gap-3 rounded-[18px] p-6 lg:p-7",
                owes ? (overdue ? "bg-bad-soft" : "border border-border bg-surface") : "bg-good-soft",
              )}
            >
              <h2 className={cn("text-sm font-[550]", owes && overdue ? "text-bad-ink" : owes ? "text-muted" : "text-good-ink")}>
                {t.toPay}
              </h2>
              <MoneyDisplay
                grosze={portal.outstandingGrosze}
                locale={locale}
                className={cn(
                  "text-[38px] leading-[44px] tracking-[-1px] lg:text-[44px] lg:leading-[52px]",
                  owes ? (overdue ? "text-bad" : "text-fg") : "text-good",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                {next ? (
                  <Badge tone={overdue ? "critical" : "info"} icon={overdue ? AlertCircle : FileText}>
                    {fill(overdue ? t.dueOverdue : t.dueOn, { date: formatDateIn(next.dueDate, locale, "dayMonth") })}
                  </Badge>
                ) : (
                  <Badge tone="good" icon={CheckCircle2}>
                    {t.settled}
                  </Badge>
                )}
              </div>
              {next ? (
                <div className="mt-2">
                  <Button asChild variant="secondary">
                    {/* Odnośnik, nie przycisk z `fetch`: pobieranie zostaje po
                        stronie przeglądarki, a na telefonie otwiera się w jej
                        podglądzie PDF-ów. */}
                    <a href={`/api/portal/invoices/${next.id}/pdf`} target="_blank" rel="noopener">
                      <Download className="size-[18px]" aria-hidden />
                      {t.documentPdf}
                    </a>
                  </Button>
                </div>
              ) : null}
            </section>

            {/* Jak zapłacić: numer rachunku i tytuł przelewu do skopiowania. */}
            <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-5 lg:p-7">
              <h2 className="text-[15px] font-[650] text-fg">{t.paymentTitle}</h2>
              {portal.landlord.bankAccount ? (
                <CopyField
                  label={t.bankAccount}
                  value={formatBankAccount(portal.landlord.bankAccount, locale)}
                  copyLabel={fill(t.copy, { label: t.bankAccount })}
                  copiedLabel={t.copied}
                />
              ) : (
                <p className="text-sm text-muted">{t.noBankAccount}</p>
              )}
              <CopyField
                label={t.transferTitle}
                value={fill(t.transferTitleValue, { address: formatPropertyAddress(lease.property) })}
                copyLabel={fill(t.copy, { label: t.transferTitle })}
                copiedLabel={t.copied}
              />
            </section>
          </div>
        ) : (
          <EmptyState icon={Home} title={t.noLeaseTitle} action={writeToLandlord} />
        )}

        {portal.leases.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-6">
            {/* Warunki umowy w jednym pasku. Kilka umów = kilka pasków. */}
            <section className="rounded-[18px] border border-border bg-surface px-5 py-5 lg:px-7">
              {portal.leases.length > 1 ? (
                <h2 className="mb-4 text-[15px] font-[650] text-fg">
                  {entry.property.name}
                  {entry.room ? `, ${entry.room.name}` : ""}
                </h2>
              ) : (
                <h2 className="sr-only">{entry.property.name}</h2>
              )}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
                <Term label={t.rent} value={formatMoney(entry.rentGrosze, locale)} mono />
                <Term
                  label={t.utilities}
                  value={
                    entry.utilitiesAdvanceGrosze > 0
                      ? formatMoney(entry.utilitiesAdvanceGrosze, locale)
                      : utilitiesModeLabels(d)[entry.utilitiesMode]
                  }
                  sub={entry.utilitiesAdvanceGrosze > 0 ? utilitiesModeLabels(d)[entry.utilitiesMode] : undefined}
                  mono={entry.utilitiesAdvanceGrosze > 0}
                />
                <Term
                  label={t.period}
                  value={
                    entry.endDate
                      ? `${formatDateIn(entry.startDate, locale, "short")} - ${formatDateIn(entry.endDate, locale, "short")}`
                      : fill(t.periodFrom, { date: formatDateIn(entry.startDate, locale, "short") })
                  }
                />
                <Term label={t.paymentTerm} value={fill(t.paymentTermDays, { days: entry.paymentTermDays })} />
              </dl>
            </section>

            <section className="rounded-[18px] border border-border bg-surface px-5 pt-5 pb-2 lg:px-7">
              <h2 className="pb-3 text-[15px] font-[650] text-fg">{t.invoices}</h2>
              {entry.invoices.length === 0 ? (
                <p className="border-t border-border py-4 text-sm text-muted">{t.noInvoices}</p>
              ) : (
                <ul>
                  {entry.invoices.map((invoice) => {
                    const owesThis = invoice.remainingGrosze > 0 && invoice.displayStatus !== "CANCELLED";
                    // Miesiąc, którego dotyczy dokument; bez okresu (kaucja) — miesiąc wystawienia.
                    const period = invoice.periodStart ?? invoice.issueDate;
                    return (
                      <li
                        key={invoice.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 border-t border-border py-3 sm:grid-cols-[minmax(0,1fr)_11rem_9rem_2.5rem]"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[14.5px] font-semibold text-fg first-letter:uppercase">
                            {months[period.getUTCMonth()]} {period.getUTCFullYear()}
                          </span>
                          <span className="font-mono text-[13px] text-muted">{invoice.number}</span>
                        </span>
                        <span className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                          <InvoiceStatusBadge
                            status={invoice.displayStatus}
                            d={d}
                            size="sm"
                            due={{ date: invoice.dueDate, now, locale }}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-right font-mono text-[14.5px] font-semibold whitespace-nowrap",
                            owesThis && invoice.displayStatus === "OVERDUE" ? "text-bad" : "text-fg",
                          )}
                        >
                          {formatMoney(invoice.totalGrossGrosze, locale)}
                        </span>
                        <a
                          href={`/api/portal/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener"
                          aria-label={fill(t.downloadPdfAria, { number: invoice.number })}
                          className="flex size-9 items-center justify-center justify-self-end rounded-control text-subtle transition-colors hover:bg-hover hover:text-fg"
                        >
                          <Download className="size-[18px]" aria-hidden />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ))}

        {/* Wynajmujący: z kim jest umowa i jak się z nim skontaktować. */}
        <section className="flex flex-wrap items-center gap-4 rounded-[18px] border border-border bg-surface px-5 py-5 lg:px-7">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight-soft text-[13px] font-semibold text-warn-ink"
            aria-hidden
          >
            {initials(portal.landlord.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[14.5px] font-semibold text-fg">{portal.landlord.name}</p>
            <p className="text-[13px] text-muted">
              {t.landlord}
              {portal.landlord.street
                ? `, ${portal.landlord.street}, ${[portal.landlord.postalCode, portal.landlord.city].filter(Boolean).join(" ")}`
                : ""}
            </p>
          </div>
          {portal.landlord.contactEmail ? (
            <Button asChild variant="secondary">
              <a href={`mailto:${portal.landlord.contactEmail}`}>
                <Mail className="size-[18px]" aria-hidden />
                {t.write}
              </a>
            </Button>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <I18nProvider locale={locale} dictionary={clientDictionary(locale)}>
      <div className="min-h-dvh bg-bg">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-8 lg:h-[72px]">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="size-8 shrink-0" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-[650] text-fg">{portal?.landlord.name ?? t.title}</span>
              {portal ? <span className="text-[12.5px] text-muted">{t.title}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" aria-label={t.signOut}>
                <LogOut className="size-[18px]" aria-hidden />
                <span className="hidden sm:inline">{t.signOut}</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">{body}</main>
      </div>
    </I18nProvider>
  );
}

function Term({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:pl-6 sm:first:pl-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={cn("text-[17px] font-[650] break-words text-fg", mono && "font-mono whitespace-nowrap")}>{value}</dd>
      {sub ? <dd className="text-[12.5px] text-subtle">{sub}</dd> : null}
    </div>
  );
}

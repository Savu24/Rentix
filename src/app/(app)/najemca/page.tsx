import { FileDown, Home, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(app)/actions";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/auth/session";
import { formatBankAccount } from "@/lib/bank-account";
import { organizationAllows } from "@/lib/billing/server";
import { ROUTES } from "@/lib/auth/routes";
import { INVOICE_STATUS_TONE } from "@/lib/invoices/status";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { formatPropertyAddress } from "@/lib/properties/address";
import { getTenantPortal } from "@/lib/tenants/portal";
import { leaseStatusLabels, utilitiesModeLabels } from "@/lib/validations/lease";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { requestLocale } from "@/lib/i18n/server";
import { tenantPortalLocale } from "@/lib/panel/dictionary";

/**
 * Panel najemcy — widok tylko do odczytu.
 *
 * Adres, na który `landingPathForRole()` odsyła konta z rolą TENANT. Do tej
 * pory ten cel nie istniał, więc najemca po zalogowaniu trafiał w 404.
 *
 * Osobny, prosty układ zamiast layoutu panelu właściciela: najemca ma jedną
 * stronę i nawigacja boczna z Nieruchomościami czy Raportami byłaby dla niego
 * bez sensu — a część pozycji prowadziłaby do danych, których nie ma prawa
 * zobaczyć.
 */
/**
 * Tytuł karty w języku wynajmującego — tego samego, w którym najemca ogląda
 * resztę portalu. Sesji tu nie ma, więc bierzemy preferencję z żądania;
 * rozjazd dotyczy wyłącznie tytułu karty i naprawia się po pierwszym wejściu.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await requestLocale()).panel.tenantPortal.title };
}

export default async function TenantPortalPage() {
  const session = await requireSession(ROUTES.tenantDashboard);

  // Właściciel, który trafił tu z zakładki, wraca do swojego panelu.
  if (session.user.role !== "TENANT") redirect(ROUTES.ownerDashboard);

  const portal = await getTenantPortal(session.user.id);

  /*
    Portal jest funkcją planu wynajmującego, więc po zejściu z planu strona
    musi powiedzieć to wprost. Wylogowanie najemcy albo pusta strona kazałyby
    mu szukać przyczyny u siebie — a przyczyna leży po drugiej stronie umowy
    i nie ma nic, co mógłby z nią zrobić poza zapytaniem wynajmującego.
  */
  const portalAllowed = portal
    ? await organizationAllows(portal.landlord.id, "TENANT_PORTAL")
    : true;

  /*
    Język bierze się z organizacji wynajmującego, a nie z ciasteczka najemcy:
    to jego najem, jego dokumenty i jego kwoty najemca tu ogląda, a wersję
    krajową konta wybrał wynajmujący, nie odwiedzający.
  */
  const locale = tenantPortalLocale(portal?.landlord.locale);
  const d = getDictionary(locale);
  const t = d.panel.tenantPortal;

  return (
    <I18nProvider locale={locale} dictionary={clientDictionary(locale)}>
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <Logo size="sm" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t.signOut}</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        {portal && !portalAllowed ? (
          <EmptyState
            icon={Home}
            title={t.unavailableTitle}
            description={t.unavailableLead}
          />
        ) : !portal ? (
          // Konto istnieje, ale nie jest powiązane z żadnym profilem najemcy.
          // Nie zgadujemy po adresie e-mail — powiązanie robi właściciel.
          <EmptyState
            icon={Home}
            title={t.notLinkedTitle}
            description={t.notLinkedLead}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="r-display text-[26px] leading-tight text-fg">
                {fill(d.panel.panelMisc.tenantPortalGreeting, {
                  name: portal.tenant.firstName,
                })}
              </h1>
              <p className="text-sm text-muted">
                {fill(t.lead, { landlord: portal.landlord.name })}
              </p>
            </div>

            {portal.outstandingGrosze > 0 ? (
              <Alert tone="warning">
                {fill(t.outstanding, {
                  amount: formatMoney(portal.outstandingGrosze, locale),
                })}
              </Alert>
            ) : (
              <Alert tone="success">{t.settled}</Alert>
            )}

            {portal.leases.length === 0 ? (
              <EmptyState
                icon={Home}
                title={t.noLeaseTitle}
                description={t.noLeaseLead}
              />
            ) : (
              portal.leases.map((lease) => (
                <section key={lease.id} className="flex flex-col gap-3">
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-fg">
                          {lease.property.name}
                          {lease.room ? ` · ${lease.room.name}` : ""}
                        </h2>
                        <Badge>{leaseStatusLabels(d)[lease.status]}</Badge>
                      </div>

                      <p className="text-xs text-muted">
                        {formatPropertyAddress(lease.property)}
                      </p>

                      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
                        <Term label={t.rent} value={formatMoney(lease.rentGrosze, locale)} />
                        <Term
                          label={t.period}
                          value={`${formatDateIn(lease.startDate, locale, "long")} – ${
                            lease.endDate
                              ? formatDateIn(lease.endDate, locale, "long")
                              : t.openEnded
                          }`}
                        />
                        <Term
                          label={t.utilities}
                          value={utilitiesModeLabels(d)[lease.utilitiesMode]}
                        />
                        {lease.utilitiesAdvanceGrosze > 0 ? (
                          <Term
                            label={t.utilitiesAdvance}
                            value={fill(t.perMonthSuffix, {
                              amount: formatMoney(lease.utilitiesAdvanceGrosze, locale),
                            })}
                          />
                        ) : null}
                        <Term
                          label={t.paymentTerm}
                          value={fill(t.paymentTermDays, { days: lease.paymentTermDays })}
                        />
                      </dl>
                    </CardContent>
                  </Card>

                  <h3 className="text-sm font-semibold text-fg">
                    {t.invoices}{" "}
                    <span className="font-normal text-muted">({lease.invoices.length})</span>
                  </h3>

                  {lease.invoices.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-sm text-muted">
                        {t.noInvoices}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col p-0">
                        {lease.invoices.map((invoice, index) => {
                          const tone = INVOICE_STATUS_TONE[invoice.displayStatus];

                          return (
                            <div
                              key={invoice.id}
                              className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${
                                index > 0 ? "border-t border-border" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-fg">{invoice.number}</p>
                                <p className="text-xs text-muted">
                                  {fill(t.dueOn, {
                                    date: formatDateIn(invoice.dueDate, locale, "short"),
                                  })}
                                </p>
                              </div>
                              <Badge tone={tone}>{d.panel.invoices.status[invoice.displayStatus]}</Badge>
                              <p className="tabular w-24 text-right font-mono text-sm text-fg">
                                {formatMoney(invoice.totalGrossGrosze, locale)}
                              </p>
                              {/* Odnośnik, nie przycisk z `fetch`: pobieranie
                                  zostaje po stronie przeglądarki, a na telefonie
                                  otwiera się w jej podglądzie PDF-ów. */}
                              <a
                                href={`/api/portal/invoices/${invoice.id}/pdf`}
                                target="_blank"
                                rel="noopener"
                                aria-label={fill(t.downloadPdfAria, { number: invoice.number })}
                                className="rounded-btn inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                              >
                                <FileDown className="h-4 w-4" aria-hidden />
                                {t.downloadPdf}
                              </a>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </section>
              ))
            )}

            {/* Karta płatności ma sens dopiero przy jakiejkolwiek umowie —
                bez niej nie ma ani tytułu przelewu, ani za co płacić. */}
            {portal.leases.length > 0 ? (
            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-[13px] font-semibold text-fg">{t.paymentTitle}</p>

                {portal.landlord.bankAccount ? (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
                    <Term
                      label={t.bankAccount}
                      value={formatBankAccount(portal.landlord.bankAccount, locale)}
                    />
                    <Term
                      label={t.transferTitle}
                      value={fill(t.transferTitleValue, {
                        address: formatPropertyAddress(portal.leases[0]!.property),
                      })}
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-muted">{t.noBankAccount}</p>
                )}

                {portal.landlord.contactEmail ? (
                  <p className="text-xs text-muted">
                    {t.contact}:{" "}
                    <a className="underline" href={`mailto:${portal.landlord.contactEmail}`}>
                      {portal.landlord.contactEmail}
                    </a>
                  </p>
                ) : null}
              </CardContent>
            </Card>
            ) : null}

            <Card className="bg-surface-alt">
              <CardContent className="flex flex-col gap-1 p-4 text-xs">
                <p className="text-[13px] font-semibold text-fg">{t.landlord}</p>
                <p className="text-muted">{portal.landlord.name}</p>
                {portal.landlord.street ? (
                  <p className="text-muted">
                    {portal.landlord.street},{" "}
                    {[portal.landlord.postalCode, portal.landlord.city].filter(Boolean).join(" ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
    </I18nProvider>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}

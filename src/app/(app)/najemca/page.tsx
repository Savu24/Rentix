import { Home, LogOut } from "lucide-react";
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
import { ROUTES } from "@/lib/auth/routes";
import { INVOICE_STATUS_META } from "@/lib/invoices/status";
import { formatPLN } from "@/lib/money";
import { formatPropertyAddress } from "@/lib/properties/address";
import { getTenantPortal } from "@/lib/tenants/portal";
import { leaseStatusLabels, utilitiesModeLabels } from "@/lib/validations/lease";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { tenantPortalLocale } from "@/lib/panel/dictionary";

export const metadata: Metadata = { title: "Twój najem" };

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });
const shortDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

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
export default async function TenantPortalPage() {
  const session = await requireSession(ROUTES.tenantDashboard);

  // Właściciel, który trafił tu z zakładki, wraca do swojego panelu.
  if (session.user.role !== "TENANT") redirect(ROUTES.ownerDashboard);

  const portal = await getTenantPortal(session.user.id);

  /*
    Język bierze się z organizacji wynajmującego, a nie z ciasteczka najemcy:
    to jego najem, jego dokumenty i jego kwoty najemca tu ogląda, a wersję
    krajową konta wybrał wynajmujący, nie odwiedzający.
  */
  const locale = tenantPortalLocale(portal?.landlord.locale);
  const d = getDictionary(locale);

  return (
    <I18nProvider locale={locale} dictionary={d}>
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <Logo size="sm" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Wyloguj</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        {!portal ? (
          // Konto istnieje, ale nie jest powiązane z żadnym profilem najemcy.
          // Nie zgadujemy po adresie e-mail — powiązanie robi właściciel.
          <EmptyState
            icon={Home}
            title="Twoje konto nie jest jeszcze powiązane z umową"
            description="Poproś wynajmującego o przypisanie konta do Twojego profilu najemcy. Wtedy zobaczysz tu umowę i rozliczenia."
          />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="r-display text-[26px] leading-tight text-fg">
                Cześć, {portal.tenant.firstName}
              </h1>
              <p className="text-sm text-muted">
                Twoja umowa i rozliczenia u {portal.landlord.name}.
              </p>
            </div>

            {portal.outstandingGrosze > 0 ? (
              <Alert tone="warning">
                Do zapłaty: <strong>{formatPLN(portal.outstandingGrosze)}</strong>. Szczegóły
                w rozliczeniach poniżej.
              </Alert>
            ) : (
              <Alert tone="success">Nie masz zaległości. Wszystko rozliczone.</Alert>
            )}

            {portal.leases.length === 0 ? (
              <EmptyState
                icon={Home}
                title="Nie masz jeszcze żadnej umowy"
                description="Gdy wynajmujący wystawi umowę, pojawi się tutaj razem z rozliczeniami."
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
                        <Term label="Czynsz miesięczny" value={formatPLN(lease.rentGrosze)} />
                        <Term
                          label="Okres najmu"
                          value={`${dateFormat.format(lease.startDate)} – ${
                            lease.endDate ? dateFormat.format(lease.endDate) : "czas nieokreślony"
                          }`}
                        />
                        <Term
                          label="Rozliczenie mediów"
                          value={utilitiesModeLabels(d)[lease.utilitiesMode]}
                        />
                        {lease.utilitiesAdvanceGrosze > 0 ? (
                          <Term
                            label="Zaliczka na media"
                            value={`${formatPLN(lease.utilitiesAdvanceGrosze)} / mies.`}
                          />
                        ) : null}
                        <Term
                          label="Termin płatności"
                          value={`${lease.paymentTermDays} dni od wystawienia`}
                        />
                      </dl>
                    </CardContent>
                  </Card>

                  <h3 className="text-sm font-semibold text-fg">
                    Rozliczenia{" "}
                    <span className="font-normal text-muted">({lease.invoices.length})</span>
                  </h3>

                  {lease.invoices.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-sm text-muted">
                        Nie wystawiono jeszcze żadnego rozliczenia.
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col p-0">
                        {lease.invoices.map((invoice, index) => {
                          const meta = INVOICE_STATUS_META[invoice.displayStatus];

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
                                  termin {shortDate.format(invoice.dueDate)}
                                </p>
                              </div>
                              <Badge tone={meta.tone}>{meta.label}</Badge>
                              <p className="tabular w-24 text-right font-mono text-sm text-fg">
                                {formatPLN(invoice.totalGrossGrosze)}
                              </p>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </section>
              ))
            )}

            <Card className="bg-surface-alt">
              <CardContent className="flex flex-col gap-1 p-4 text-xs">
                <p className="text-[13px] font-semibold text-fg">Wynajmujący</p>
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

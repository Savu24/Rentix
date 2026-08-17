import { ArrowLeft, Download, Home, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import { TerminateLease } from "@/components/panel/leases/terminate-lease";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { getLease } from "@/lib/leases/service";
import { INVOICE_STATUS_META, resolveInvoiceStatus } from "@/lib/invoices/status";
import { formatPLN } from "@/lib/money";
import { groszeToPolishWords } from "@/lib/money-words";
import { formatPropertyAddress } from "@/lib/properties/address";
import {
  LEASE_STATUS_LABEL,
  LEASE_STATUS_TONE,
  UTILITIES_MODE_INCOMPLETE,
  UTILITIES_MODE_LABEL,
} from "@/lib/validations/lease";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const lease = await getLease(session.user.organizationId, id);

  return { title: lease?.number ? `Umowa ${lease.number}` : "Umowa" };
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export default async function LeaseDetailPage({ params }: Params) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const lease = await getLease(session.user.organizationId, id);
  if (!lease) notFound();

  const now = new Date();
  const canTerminate = lease.status === "ACTIVE" || lease.status === "DRAFT";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/umowy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Umowy
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">
                {lease.number ? `Umowa ${lease.number}` : "Umowa najmu"}
              </h1>
              <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                {LEASE_STATUS_LABEL[lease.status]}
              </Badge>
            </div>

            <p className="text-sm text-muted">
              {dateFormat.format(lease.startDate)} –{" "}
              {lease.endDate ? dateFormat.format(lease.endDate) : "czas nieokreślony"}
            </p>
          </div>

          <Button asChild size="sm">
            {/* target="_blank": PDF otwiera się w podglądzie, a użytkownik
                nie traci widoku umowy. */}
            <a href={`/api/leases/${lease.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" aria-hidden />
              Pobierz PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Home className="h-3.5 w-3.5 text-muted" aria-hidden />
              Przedmiot najmu
            </p>
            <Link
              href={`/panel/nieruchomosci/${lease.property.id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              {lease.property.name}
              {lease.room ? ` · ${lease.room.name}` : ""}
            </Link>
            {lease.room ? (
              <Badge tone="accent" className="w-fit">
                Najem pojedynczego pokoju
              </Badge>
            ) : null}
            <p className="text-xs text-muted">
              {formatPropertyAddress(lease.property)}
            </p>
            {lease.property.areaM2 ? (
              <p className="text-xs text-muted">
                {lease.property.areaM2.toFixed(2).replace(".", ",")} m²
                {lease.property.floor !== null ? ` · piętro ${lease.property.floor}` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <User className="h-3.5 w-3.5 text-muted" aria-hidden />
              {lease.tenants.length > 1 ? "Najemcy" : "Najemca"}
            </p>
            {lease.tenants.map(({ tenant, isPrimary }) => (
              <div key={tenant.id} className="flex items-center gap-2">
                <Link
                  href={`/panel/najemcy/${tenant.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {tenant.firstName} {tenant.lastName}
                </Link>
                {isPrimary && lease.tenants.length > 1 ? (
                  <Badge tone="accent">główny</Badge>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-[13px] font-semibold text-fg">Warunki finansowe</p>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
            <Term label="Czynsz miesięczny" value={formatPLN(lease.rentGrosze)} />
            <Term label="Słownie" value={groszeToPolishWords(lease.rentGrosze)} />
            <Term label="Kaucja" value={formatPLN(lease.depositGrosze)} />
            <Term label="Rozliczenie mediów" value={UTILITIES_MODE_LABEL[lease.utilitiesMode]} />
            {lease.utilitiesAdvanceGrosze > 0 ? (
              <Term
                label="Zaliczka na media"
                value={`${formatPLN(lease.utilitiesAdvanceGrosze)} / mies.`}
              />
            ) : null}
            <Term label="Dzień naliczania" value={`${lease.billingDay}. dzień miesiąca`} />
            <Term label="Termin płatności" value={`${lease.paymentTermDays} dni`} />
          </dl>
        </CardContent>
      </Card>

      {/* Ostrzeżenie zostaje na karcie umowy, nie tylko w formularzu: umowę
          zakłada się raz, a rozliczenia wystawia co miesiąc. */}
      {UTILITIES_MODE_INCOMPLETE[lease.utilitiesMode] ? (
        <Alert tone="warning">{UTILITIES_MODE_INCOMPLETE[lease.utilitiesMode]}</Alert>
      ) : null}

      <section className="flex flex-col gap-2">
        {/* Naliczanie i wystawianie przeniesione do profilu najemcy:
            rozliczamy człowieka, a nie umowę — ten sam najemca miewa dwie
            umowy i oczekuje jednego miejsca do obsługi płatności. */}
        <h2 className="text-[15px] font-semibold text-fg">
          Rozliczenia <span className="font-normal text-muted">({lease.invoices.length})</span>
        </h2>

        {lease.invoices.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              Do tej umowy nie wystawiono jeszcze dokumentów. Czynsz nalicza się automatycznie
              w {lease.billingDay}. dniu miesiąca.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {lease.invoices.map((invoice, index) => {
                const status = resolveInvoiceStatus(invoice, now);
                const meta = INVOICE_STATUS_META[status];

                return (
                  <Link
                    key={invoice.id}
                    href={`/panel/finanse/${invoice.id}`}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-alt ${
                      index > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{invoice.number}</p>
                      <p className="text-xs text-muted">
                        termin {new Intl.DateTimeFormat("pl-PL").format(invoice.dueDate)}
                        {invoice.payments.length > 0
                          ? ` · ${invoice.payments.length} ${
                              invoice.payments.length === 1 ? "wpłata" : "wpłat"
                            }`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <p className="tabular w-24 text-right font-mono text-sm text-fg">
                      {formatPLN(invoice.totalGrossGrosze)}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {lease.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="text-[13px] font-semibold text-fg">Ustalenia dodatkowe</p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{lease.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {lease.terminatedAt ? (
        <Card className="bg-bad-soft">
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="text-[13px] font-semibold text-fg">
              Umowa zakończona {dateFormat.format(lease.terminatedAt)}
            </p>
            {lease.terminationNote ? (
              <p className="text-sm text-fg/80">{lease.terminationNote}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : canTerminate ? (
        <TerminateLease leaseId={lease.id} />
      ) : null}

      {/* Archiwizacja dopiero po zakończeniu umowy — aktywna zajmuje jednostkę,
          więc schowana z listy zostawiłaby lokal zablokowany bez śladu. */}
      {lease.status !== "ACTIVE" ? (
        <ArchiveAction
          endpoint="/api/leases"
          id={lease.id}
          archived={lease.archivedAt !== null}
          label="umowę"
          hint="Zniknie z listy umów. Faktury, wpłaty i cała historia rozliczeń zostaną nietknięte."
        />
      ) : null}
    </div>
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

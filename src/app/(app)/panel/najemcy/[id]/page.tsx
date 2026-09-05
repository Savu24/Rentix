import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarClock,
  DoorOpen,
  FileText,
  Home,
  IdCard,
  Mail,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { GenerateInvoices } from "@/components/panel/invoices/generate-invoices";
import { ManualInvoiceForm } from "@/components/panel/invoices/manual-invoice-form";
import { INVOICE_STATUS_TONE, remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { leaseExpiryLabel, resolveLeaseExpiry } from "@/lib/leases/expiry";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { getTenant } from "@/lib/tenants/service";
import { leaseStatusLabels, LEASE_STATUS_TONE } from "@/lib/validations/lease";
import { tenantStatusLabels, TENANT_STATUS_TONE } from "@/lib/validations/tenant";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const tenant = await getTenant(session.user.organizationId, id);

  return {
    title: tenant
      ? `${tenant.firstName} ${tenant.lastName}`
      : (await panelDictionary()).panel.panelMisc.meta.tenant,
  };
}


export default async function TenantDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.tenantsPage.detail;
  const misc = d.panel.panelMisc;
  const session = await requireOwnerSession();
  const { id } = await params;

  const tenant = await getTenant(session.user.organizationId, id);
  if (!tenant) notFound();

  const leases = tenant.leases.map((entry) => entry.lease);
  const activeLeases = leases.filter((lease) => lease.status === "ACTIVE");
  const invoices = leases.flatMap((lease) => lease.invoices);
  const payments = invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.number })),
  );

  const now = new Date();
  const outstanding = invoices
    .filter((invoice) => ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status))
    .reduce((total, invoice) => total + remainingGrosze(invoice), 0);
  const totalPaid = payments.reduce((total, payment) => total + payment.amountGrosze, 0);

  // Przy dwóch aktywnych umowach liczy się ta, która kończy się pierwsza —
  // to ona wymaga decyzji najwcześniej.
  const expiry = activeLeases
    .map((lease) => resolveLeaseExpiry(lease.endDate, now))
    .filter((value) => value !== null)
    .sort((a, b) => a.days - b.days)[0];

  const emergencyName = [tenant.emergencyContactFirstName, tenant.emergencyContactLastName]
    .filter(Boolean)
    .join(" ");
  // Każda sekcja pojawia się dopiero, gdy jest co pokazać — pusta ramka
  // z kreskami tylko odsuwałaby rozliczenia w dół.
  const hasIdentity = Boolean(
    tenant.idCardNumber ||
      tenant.pesel ||
      tenant.passportNumber ||
      tenant.residenceCardNumber ||
      tenant.dateOfBirth,
  );
  // Kontakt awaryjny ma własną ramkę: to nie jest dokument najemcy, tylko
  // numer do obcej osoby, po który sięga się w zupełnie innej sytuacji.
  const hasEmergency = Boolean(
    emergencyName || tenant.emergencyContactPhone || tenant.emergencyContactEmail,
  );

  // Adres zameldowania to nie jest adres do faktury — ten drugi siedzi
  // w `tenant.street` i idzie na dokument, ten wchodzi do umowy najmu
  // okazjonalnego. Sklejamy go tu, bo nigdzie indziej się nie pojawia.
  const registeredAddress = [
    tenant.registeredStreet,
    [tenant.registeredPostalCode, tenant.registeredCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const hasRegistered = Boolean(registeredAddress || tenant.registeredUntil);
  const hasBilling = Boolean(
    tenant.billingEmail || tenant.billingPhone || tenant.depositRefundAccount,
  );
  const hasWork = Boolean(tenant.employerName || tenant.employmentUntil);
  const hasInsurance = Boolean(
    tenant.insurerName || tenant.insurancePolicyNumber || tenant.insuranceExpiresAt,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/najemcy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Najemcy
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">
                {tenant.firstName} {tenant.lastName}
              </h1>
              <Badge tone={TENANT_STATUS_TONE[tenant.status]}>
                {tenantStatusLabels(d)[tenant.status]}
              </Badge>
              {/* Osoby fizycznej nie oznaczamy — to domyślny przypadek,
                  a plakietka „osoba fizyczna" przy każdym najemcy nie niosłaby
                  żadnej informacji. */}
              {tenant.legalForm === "COMPANY" ? <Badge tone="accent">{t.company}</Badge> : null}
              {expiry ? (
                <Badge tone={expiry.tone}>
                  <CalendarClock className="h-3 w-3" aria-hidden />
                  {leaseExpiryLabel(expiry, locale, d.panel.leasesPage.expiry)}
                </Badge>
              ) : null}
            </div>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {tenant.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {tenant.email}
                </span>
              ) : null}
              {tenant.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {tenant.phone}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/najemcy/${tenant.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edytuj
              </Link>
            </Button>

            <ArchiveAction
              endpoint="/api/tenants"
              id={tenant.id}
              archived={tenant.archivedAt !== null}
              label={t.archiveLabel}
              hint={t.archiveHint}
            />

            {/* Przypisanie idzie przez kreator umowy z wypełnionym najemcą —
                nie dublujemy mechanizmu, bo o tym, kto gdzie mieszka,
                rozstrzyga umowa. */}
            <Button asChild size="sm">
              <Link href={`/panel/umowy/nowa?tenantId=${tenant.id}`}>
                <DoorOpen className="h-4 w-4" aria-hidden />
                {t.assignToProperty}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile
          label={t.outstanding}
          value={formatMoney(outstanding, locale)}
          tone={outstanding > 0 ? "bad" : "good"}
        />
        <SummaryTile label={t.paidTotal} value={formatMoney(totalPaid, locale)} />
        <SummaryTile label={t.leases} value={String(leases.length)} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-fg">{t.leases}</h2>
        {leases.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              {misc.noLeasesYet}{" "}
              <Link href="/panel/umowy/nowa" className="font-medium text-accent hover:underline">
                {t.createLease}
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          leases.map((lease) => (
            <Card key={lease.id} className="transition-colors hover:border-muted">
              <Link href={`/panel/umowy/${lease.id}`} className="block rounded-card">
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-fg">
                        {lease.property.name}
                        {lease.room ? ` · ${lease.room.name}` : ""}
                      </p>
                      <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                        {leaseStatusLabels(d)[lease.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateIn(lease.startDate, locale, "short")} –{" "}
                      {lease.endDate
                        ? formatDateIn(lease.endDate, locale, "short")
                        : t.openEnded}
                      {lease.number ? fill(t.leaseNumber, { number: lease.number }) : ""}
                    </p>
                  </div>
                  <p className="tabular font-mono text-sm font-medium text-fg">
                    {fill(t.perMonth, { amount: formatMoney(lease.rentGrosze, locale) })}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.invoices}</h2>

          {/* Obsługa płatności siedzi przy najemcy, a nie przy umowie:
              rozliczamy człowieka, a jeden najemca miewa dwie umowy. */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeLeases.length > 0 ? <GenerateInvoices tenantId={tenant.id} /> : null}
            <ManualInvoiceForm
              tenantId={tenant.id}
              tenantName={`${tenant.firstName} ${tenant.lastName}`}
              leases={leases.map((lease) => ({
                id: lease.id,
                label: `${lease.property.name}${lease.room ? ` · ${lease.room.name}` : ""}`,
                rentGrosze: lease.rentGrosze,
              }))}
            />
          </div>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">{t.noInvoices}</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {invoices.slice(0, 12).map((invoice, index) => {
                const status = resolveInvoiceStatus(invoice, now);
                const tone = INVOICE_STATUS_TONE[status];

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
                        {fill(misc.dueOn, { date: formatDateIn(invoice.dueDate, locale, "short") })}
                      </p>
                    </div>
                    <Badge tone={tone}>{d.panel.invoices.status[status]}</Badge>
                    <p className="tabular w-24 text-right font-mono text-sm text-fg">
                      {formatMoney(invoice.totalGrossGrosze)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
          {t.messages}
        </h2>
        {tenant.messageThreads.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              {t.noThreads}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {tenant.messageThreads.map((thread, index) => (
                <div
                  key={thread.id}
                  className={`px-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-fg">
                      {thread.subject ?? t.threadWithoutSubject}
                    </p>
                    <p className="shrink-0 text-xs text-muted">
                      {formatDateIn(thread.lastMessageAt, locale, "short")}
                    </p>
                  </div>
                  {thread.messages[0] ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {thread.messages[0].body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    {thread._count.messages}{" "}
                    {pluralize(locale, thread._count.messages, misc.threadMessages)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {hasIdentity ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <IdCard className="h-4 w-4 text-muted" aria-hidden />
            {t.identity}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.idCard} value={tenant.idCardNumber} />
              <DetailItem label={t.nationalId} value={tenant.pesel} />
              <DetailItem label={t.passport} value={tenant.passportNumber} />
              <DetailItem label={t.residenceCard} value={tenant.residenceCardNumber} />
              <DetailItem
                label={t.dateOfBirth}
                value={tenant.dateOfBirth ? formatDateIn(tenant.dateOfBirth, locale, "short") : null}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasEmergency ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <LifeBuoy className="h-4 w-4 text-muted" aria-hidden />
            {t.emergency}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.person} value={emergencyName || null} />
              <DetailItem label={t.phone} value={tenant.emergencyContactPhone} />
              <DetailItem label={t.email} value={tenant.emergencyContactEmail} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasRegistered ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Home className="h-4 w-4 text-muted" aria-hidden />
            {t.registered}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.address} value={registeredAddress || null} />
              <DetailItem
                label={t.registeredUntil}
                value={
                  tenant.registeredUntil
                    ? formatDateIn(tenant.registeredUntil, locale, "short")
                    : misc.indefinite
                }
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasBilling ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Banknote className="h-4 w-4 text-muted" aria-hidden />
            {t.payments}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.billingEmail} value={tenant.billingEmail} />
              <DetailItem label={t.billingPhone} value={tenant.billingPhone} />
              <DetailItem label={t.depositAccount} value={tenant.depositRefundAccount} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasWork ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Briefcase className="h-4 w-4 text-muted" aria-hidden />
            {t.work}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.employer} value={tenant.employerName} />
              <DetailItem
                label={t.until}
                value={
                  tenant.employmentUntil
                    ? formatDateIn(tenant.employmentUntil, locale, "short")
                    : misc.indefinite
                }
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasInsurance ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <ShieldCheck className="h-4 w-4 text-muted" aria-hidden />
            {t.insurance}
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label={t.insurer} value={tenant.insurerName} />
              <DetailItem label={t.policyNumber} value={tenant.insurancePolicyNumber} />
              {/* Polisa po terminie jest gorsza niż jej brak — właściciel liczy
                  na ochronę, której już nie ma. Dlatego data dostaje kolor. */}
              {tenant.insuranceExpiresAt ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-xs text-muted">{t.validUntil}</p>
                  <p
                    className={`text-sm ${
                      tenant.insuranceExpiresAt < now ? "font-medium text-bad" : "text-fg"
                    }`}
                  >
                    {formatDateIn(tenant.insuranceExpiresAt, locale, "short")}
                    {tenant.insuranceExpiresAt < now ? misc.insuranceExpired : ""}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {tenant.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <FileText className="h-3.5 w-3.5 text-muted" aria-hidden />
              {t.notes}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{tenant.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Wiersz „etykieta + wartość"; brak wartości znaczy, że pole się nie pokazuje. */
function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="truncate text-sm text-fg">{value}</p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color = tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-fg";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted">{label}</p>
        <p className={`tabular font-mono text-[19px] font-medium ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

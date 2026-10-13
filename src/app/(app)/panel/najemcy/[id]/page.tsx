import {
  AlertCircle,
  Banknote,
  Briefcase,
  Clock,
  DoorOpen,
  FilePlus2,
  FileText,
  Home,
  IdCard,
  LifeBuoy,
  Mail,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import { CardTabs } from "@/components/panel/card-tabs";
import { InfoSections, nonEmptySections } from "@/components/panel/info-sections";
import { GenerateInvoices } from "@/components/panel/invoices/generate-invoices";
import { PageHeader } from "@/components/panel/page-header";
import { PlanLock } from "@/components/panel/plan-lock";
import { CardRows, SectionCard } from "@/components/panel/section-card";
import { LeaseStatusBadge, TenantStatusBadge } from "@/components/panel/status-badges";
import { TenantPortalAccess } from "@/components/panel/tenants/portal-access";
import { TenantInvoiceList } from "@/components/panel/tenants/tenant-invoice-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { tenantPortalAccess } from "@/lib/invitations/service";
import { remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { leaseExpiryLabel, resolveLeaseExpiry } from "@/lib/leases/expiry";
import { formatMoney, sumGrosze } from "@/lib/money";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { getTenant, TENANT_NOTIFICATIONS_SHOWN } from "@/lib/tenants/service";
import { cn } from "@/lib/utils";

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

  // Dostęp do portalu pytamy dopiero tutaj, a nie w `getTenant`: kartoteka
  // wchodzi też do listy najemców, gdzie ta informacja nikogo nie interesuje,
  // a kosztowałaby dwa zapytania na wiersz.
  const [portalAllowed, portal] = await Promise.all([
    organizationAllows(session.user.organizationId, "TENANT_PORTAL"),
    tenantPortalAccess(session.user.organizationId, tenant.id),
  ]);

  const leases = tenant.leases.map((entry) => entry.lease);
  const activeLeases = leases.filter((lease) => lease.status === "ACTIVE");
  const invoices = leases.flatMap((lease) => lease.invoices);
  const payments = invoices.flatMap((invoice) => invoice.payments);

  const now = new Date();
  const outstanding = sumGrosze(
    invoices
      .filter((invoice) => ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status))
      .map((invoice) => remainingGrosze(invoice)),
  );
  const totalPaid = sumGrosze(payments.map((payment) => payment.amountGrosze));
  const overdueCount = invoices.filter(
    (invoice) => resolveInvoiceStatus(invoice, now) === "OVERDUE",
  ).length;

  // Przy dwóch aktywnych umowach liczy się ta, która kończy się pierwsza —
  // to ona wymaga decyzji najwcześniej.
  const expiry = activeLeases
    .map((lease) => resolveLeaseExpiry(lease.endDate, now))
    .filter((value) => value !== null)
    .sort((a, b) => a.days - b.days)[0];

  const currentLease = activeLeases[0];
  const name = `${tenant.firstName} ${tenant.lastName}`;
  const newLeaseHref = `/panel/umowy/nowa?tenantId=${tenant.id}`;

  const emergencyName = [tenant.emergencyContactFirstName, tenant.emergencyContactLastName]
    .filter(Boolean)
    .join(" ");

  // Adres zameldowania to nie jest adres do faktury — ten drugi siedzi
  // w `tenant.street` i idzie na dokument, ten wchodzi do umowy najmu
  // okazjonalnego. Sklejamy go tu, bo nigdzie indziej się nie pojawia.
  const registeredAddress = [
    tenant.registeredStreet,
    [tenant.registeredPostalCode, tenant.registeredCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const insuranceExpired = tenant.insuranceExpiresAt !== null && tenant.insuranceExpiresAt < now;

  // Każda karta pojawia się dopiero, gdy jest co pokazać — pusta ramka
  // z kreskami tylko odsuwałaby rozliczenia w dół.
  const infoSections = nonEmptySections([
    {
      title: t.identity,
      icon: IdCard,
      items: [
        [t.idCard, tenant.idCardNumber],
        [t.nationalId, tenant.pesel],
        [t.passport, tenant.passportNumber],
        [t.residenceCard, tenant.residenceCardNumber],
        [t.dateOfBirth, tenant.dateOfBirth ? formatDateIn(tenant.dateOfBirth, locale, "numeric") : null],
      ],
    },
    {
      title: t.registered,
      icon: Home,
      items: [
        [t.address, registeredAddress || null],
        [
          t.registeredUntil,
          registeredAddress || tenant.registeredUntil
            ? tenant.registeredUntil
              ? formatDateIn(tenant.registeredUntil, locale, "numeric")
              : misc.indefinite
            : null,
        ],
      ],
    },
    // Kontakt awaryjny ma własną kartę: to nie jest dokument najemcy, tylko
    // numer do obcej osoby, po który sięga się w zupełnie innej sytuacji.
    {
      title: t.emergency,
      icon: LifeBuoy,
      items: [
        [t.person, emergencyName || null],
        [t.phone, tenant.emergencyContactPhone],
        [t.email, tenant.emergencyContactEmail],
      ],
    },
    {
      title: t.insurance,
      icon: ShieldCheck,
      items: [
        [t.insurer, tenant.insurerName],
        [t.policyNumber, tenant.insurancePolicyNumber],
        [
          t.validUntil,
          // Polisa po terminie jest gorsza niż jej brak — właściciel liczy
          // na ochronę, której już nie ma. Dlatego data dostaje plakietkę.
          tenant.insuranceExpiresAt ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn("font-mono", insuranceExpired && "text-bad")}>
                {formatDateIn(tenant.insuranceExpiresAt, locale, "numeric")}
              </span>
              {insuranceExpired ? (
                <Badge size="sm" tone="critical" icon={AlertCircle}>
                  {misc.insuranceExpired}
                </Badge>
              ) : null}
            </span>
          ) : null,
        ],
      ],
    },
    {
      title: t.work,
      icon: Briefcase,
      items: [
        [t.employer, tenant.employerName],
        [
          t.until,
          tenant.employerName || tenant.employmentUntil
            ? tenant.employmentUntil
              ? formatDateIn(tenant.employmentUntil, locale, "numeric")
              : misc.indefinite
            : null,
        ],
      ],
    },
    {
      title: t.payments,
      icon: Banknote,
      items: [
        [t.billingEmail, tenant.billingEmail],
        [t.billingPhone, tenant.billingPhone],
        [t.depositAccount, tenant.depositRefundAccount ? <span className="font-mono">{tenant.depositRefundAccount}</span> : null],
      ],
    },
    { title: t.notes, icon: NotebookPen, text: tenant.notes },
  ]);

  const portalCard = portalAllowed ? (
    <TenantPortalAccess
      tenantId={tenant.id}
      email={tenant.email}
      hasAccount={portal.hasAccount}
      /* Data przez ISO, bo komponent jest kliencki — `Date` i tak
         przechodzi przez serializację, więc lepiej jawnie. */
      pending={
        portal.pending
          ? { email: portal.pending.email, expiresAt: portal.pending.expiresAt.toISOString() }
          : null
      }
    />
  ) : (
    <PlanLock
      feature="TENANT_PORTAL"
      title={d.panel.tenantPortalAccess.locked.title}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/najemcy", label: d.panel.tenantsPage.title }}
        title={name}
        badges={
          <>
            <TenantStatusBadge status={tenant.status} d={d} />
            {/* Osoby fizycznej nie oznaczamy — to domyślny przypadek,
                a plakietka „osoba fizyczna" przy każdym najemcy nie niosłaby
                żadnej informacji. */}
            {tenant.legalForm === "COMPANY" ? (
              <Badge tone="accent" icon={Briefcase}>
                {t.company}
              </Badge>
            ) : null}
            {expiry ? (
              <Badge tone={expiry.tone === "neutral" ? "neutral" : expiry.tone} icon={Clock}>
                {leaseExpiryLabel(expiry, locale, d.panel.leasesPage.expiry)}
              </Badge>
            ) : null}
          </>
        }
        meta={
          <>
            {tenant.phone ? (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 font-mono hover:text-fg">
                <Phone className="size-4 text-subtle" aria-hidden />
                {tenant.phone}
              </a>
            ) : null}
            {tenant.email ? (
              <a href={`mailto:${tenant.email}`} className="flex min-w-0 items-center gap-1.5 hover:text-fg">
                <Mail className="size-4 shrink-0 text-subtle" aria-hidden />
                <span className="truncate">{tenant.email}</span>
              </a>
            ) : null}
            {currentLease ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-subtle" aria-hidden />
                {currentLease.property.name}
                {currentLease.room ? `, ${currentLease.room.name}` : ""}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <ArchiveAction
              endpoint="/api/tenants"
              id={tenant.id}
              archived={tenant.archivedAt !== null}
              label={t.archiveLabel}
              hint={t.archiveHint}
            />
            <Button asChild variant="secondary">
              <Link href={`/panel/najemcy/${tenant.id}/edytuj`}>
                <Pencil className="size-[18px]" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>
          </>
        }
        /* Przypisanie idzie przez kreator umowy z wypełnionym najemcą —
           nie dublujemy mechanizmu, bo o tym, kto gdzie mieszka,
           rozstrzyga umowa. */
        primary={{ href: newLeaseHref, label: t.assignToProperty, icon: DoorOpen }}
      />

      {/* Telefon: szybkie akcje zamiast przewijania do danych kontaktowych. */}
      {tenant.phone || tenant.email ? (
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          {tenant.phone ? (
            <a
              href={`tel:${tenant.phone}`}
              className="flex h-16 flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface text-[13px] font-[550] text-accent"
            >
              <Phone className="size-5" strokeWidth={1.8} aria-hidden />
              {t.call}
            </a>
          ) : null}
          {tenant.email ? (
            <a
              href={`mailto:${tenant.email}`}
              className="flex h-16 flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface text-[13px] font-[550] text-accent"
            >
              <Mail className="size-5" strokeWidth={1.8} aria-hidden />
              {t.sendEmail}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Pas kwot: do zapłaty dużą liczbą, wpłaty obok. */}
          <section className="grid gap-5 rounded-tile border border-border bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end lg:p-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-[550] text-muted">{t.outstanding}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <MoneyDisplay
                  grosze={outstanding}
                  locale={locale}
                  className={cn(
                    "text-[32px] leading-none tracking-[-0.8px] lg:text-4xl lg:tracking-[-0.9px]",
                    outstanding > 0 ? "text-bad" : "text-fg",
                  )}
                />
                {overdueCount > 0 ? (
                  <Badge tone="critical" icon={AlertCircle}>
                    {fill(d.panel.tenantsPage.overdueCount, { count: overdueCount })}
                  </Badge>
                ) : null}
              </div>
            </div>
            <span className="hidden h-16 w-px bg-border sm:block" aria-hidden />
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:border-0 sm:pt-0">
              <h2 className="text-sm font-[550] text-muted">{t.paidTotal}</h2>
              <MoneyDisplay
                grosze={totalPaid}
                locale={locale}
                className="text-[26px] leading-none tracking-[-0.6px] text-fg lg:text-[28px]"
                currencyClassName="text-muted"
              />
            </div>
          </section>

          <SectionCard
            title={t.leases}
            count={leases.length > 0 ? leases.length : undefined}
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link href={newLeaseHref}>
                  <Plus className="size-4" aria-hidden />
                  {t.createLease}
                </Link>
              </Button>
            }
          >
            {leases.length === 0 ? (
              <p className="py-2 text-sm text-muted">{misc.noLeasesYet}</p>
            ) : (
              <CardRows>
                {leases.map((lease) => (
                  <li key={lease.id}>
                    <Link
                      href={`/panel/umowy/${lease.id}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80 lg:gap-4"
                    >
                      <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft sm:flex">
                        <FileText className="size-6 text-accent" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-fg">
                          {lease.property.name}
                          {lease.room ? `, ${lease.room.name}` : ""}
                        </span>
                        <span className="block text-[13px] text-muted sm:truncate">
                          {lease.number ? `${lease.number}, ` : ""}
                          {formatDateIn(lease.startDate, locale, "short")} -{" "}
                          {lease.endDate ? formatDateIn(lease.endDate, locale, "short") : t.openEnded}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <LeaseStatusBadge status={lease.status} d={d} size="sm" />
                        <span className="font-mono text-sm font-[650] whitespace-nowrap text-fg">
                          {fill(t.perMonth, { amount: formatMoney(lease.rentGrosze, locale) })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </CardRows>
            )}
          </SectionCard>

          <SectionCard
            title={t.invoices}
            /* Obsługa płatności siedzi przy najemcy, a nie przy umowie:
               rozliczamy człowieka, a jeden najemca miewa dwie umowy. */
            actions={
              <>
                {activeLeases.length > 0 ? <GenerateInvoices tenantId={tenant.id} /> : null}
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/panel/finanse/nowy?najemca=${tenant.id}`}>
                    <FilePlus2 className="size-4" aria-hidden />
                    {d.panel.financePage.manualInvoice.open}
                  </Link>
                </Button>
              </>
            }
          >
            {invoices.length === 0 ? (
              <p className="py-2 text-sm text-muted">{t.noInvoices}</p>
            ) : (
              <TenantInvoiceList
                invoices={invoices.slice(0, 12).map((invoice) => ({
                  id: invoice.id,
                  number: invoice.number,
                  displayStatus: resolveInvoiceStatus(invoice, now),
                  dueDate: invoice.dueDate,
                  totalGrossGrosze: invoice.totalGrossGrosze,
                  remainingGrosze: remainingGrosze(invoice),
                }))}
              />
            )}
          </SectionCard>

          <SectionCard title={t.messages}>
            <CardTabs
              label={t.messages}
              tabs={[
                {
                  id: "sent",
                  label: t.sentTab,
                  count: tenant.notifications.length,
                  content:
                    tenant.notifications.length === 0 ? (
                      <p className="py-4 text-sm text-muted">{t.noSentMessages}</p>
                    ) : (
                      <>
                        <CardRows>
                          {tenant.notifications.map((notification) => (
                            <li key={notification.id} className="flex items-start gap-3 py-3">
                              <Mail className="mt-0.5 size-[18px] shrink-0 text-subtle" aria-hidden />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-[550] text-fg">
                                    {t.notificationTypes[notification.type]}
                                  </span>
                                  {notification.invoice ? (
                                    <Link
                                      href={`/panel/finanse/${notification.invoice.id}`}
                                      className="font-mono text-[13px] text-muted hover:text-fg hover:underline"
                                    >
                                      {notification.invoice.number}
                                    </Link>
                                  ) : null}
                                </span>
                                <span className="block truncate text-[13px] text-muted">
                                  {notification.toEmail}
                                  {/* Treść błędu z bramki zostaje przy wpisie: bez niej
                                      „nie dotarło" każe zgadywać, czy to literówka
                                      w adresie, czy pełna skrzynka. */}
                                  {notification.error ? `, ${notification.error}` : ""}
                                </span>
                              </span>
                              <span className="flex shrink-0 flex-col items-end gap-1.5">
                                <span className="font-mono text-[13px] text-muted">
                                  {formatDateIn(notification.createdAt, locale, "dateTime")}
                                </span>
                                {notification.status === "FAILED" ? (
                                  <Badge size="sm" tone="critical" icon={XCircle}>
                                    {t.sendFailed}
                                  </Badge>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </CardRows>
                        {tenant.notifications.length >= TENANT_NOTIFICATIONS_SHOWN ? (
                          <p className="pt-2 text-[13px] text-subtle">
                            {fill(t.sentMessagesLead, { count: String(TENANT_NOTIFICATIONS_SHOWN) })}
                          </p>
                        ) : null}
                      </>
                    ),
                },
                {
                  id: "threads",
                  label: t.threadsTab,
                  count: tenant.messageThreads.length,
                  content:
                    tenant.messageThreads.length === 0 ? (
                      <p className="py-4 text-sm text-muted">{t.noThreads}</p>
                    ) : (
                      <CardRows>
                        {tenant.messageThreads.map((thread) => (
                          <li key={thread.id} className="flex flex-col gap-1 py-3">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="text-sm font-[550] text-fg">
                                {thread.subject ?? t.threadWithoutSubject}
                              </span>
                              <span className="shrink-0 font-mono text-[13px] text-muted">
                                {formatDateIn(thread.lastMessageAt, locale, "short")}
                              </span>
                            </span>
                            {thread.messages[0] ? (
                              <span className="line-clamp-2 text-[13px] text-muted">
                                {thread.messages[0].body}
                              </span>
                            ) : null}
                            <span className="text-[13px] text-subtle">
                              {thread._count.messages}{" "}
                              {pluralize(locale, thread._count.messages, misc.threadMessages)}
                            </span>
                          </li>
                        ))}
                      </CardRows>
                    ),
                },
              ]}
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          {portalCard}
          <InfoSections
            sections={infoSections}
            columns={1}
            editHref={`/panel/najemcy/${tenant.id}/edytuj`}
            editLabel={d.panel.common.edit}
          />
        </div>
      </div>
    </div>
  );
}

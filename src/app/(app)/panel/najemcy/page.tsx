import { Archive, CalendarClock, Plus, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TenantSort } from "@/components/panel/tenants/tenant-sort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { leaseExpiryLabel, resolveLeaseExpiry } from "@/lib/leases/expiry";
import { formatMoney } from "@/lib/money";
import { listTenants } from "@/lib/tenants/service";
import { leaseStatusLabels, LEASE_STATUS_TONE } from "@/lib/validations/lease";
import {
  tenantStatusLabels,
  TENANT_STATUS_TONE,
  tenantListQuerySchema,
} from "@/lib/validations/tenant";
import { fill, pluralize } from "@/lib/i18n/format";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.title };
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.tenantsPage;
  const session = await requireOwnerSession("/panel/najemcy");
  const params = await searchParams;

  const parsed = tenantListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : tenantListQuerySchema.parse({});

  const tenants = await listTenants(session.user.organizationId, query);
  const withDebt = tenants.filter((tenant) => tenant.outstandingGrosze > 0).length;

  // Jedna chwila dla całej listy — inaczej dwaj najemcy z tą samą datą końca
  // umowy mogliby dostać różne liczby dni, gdyby render trafił w północ.
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">
            {fill(pluralize(locale, tenants.length, t.count), { count: tenants.length })}
            {withDebt > 0 ? fill(t.withDebt, { count: withDebt }) : ""}
          </p>
        </div>

        {/* Archiwum obok dodawania, bo to para: jedno chowa, drugie
            przywraca. Schowane w menu byłoby nie do znalezienia. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <TenantSort />

          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/najemcy/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              {t.archived}
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/najemcy/nowy">
              <Plus className="h-4 w-4" aria-hidden />
              {t.add}
            </Link>
          </Button>
        </div>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t.emptyTitle}
          description={t.emptyLead}
          action={
            <Button asChild>
              <Link href="/panel/najemcy/nowy">
                <Plus className="h-4 w-4" aria-hidden />
                {t.add}
              </Link>
            </Button>
          }
        />
      ) : (
        /* Karty, nie tabela — na telefonie wiersz z sześcioma kolumnami
           byłby nieczytelny, a to widok używany w biegu. */
        <div className="flex flex-col gap-2">
          {tenants.map((tenant) => {
            // Odliczanie tylko dla umowy, która trwa: przy szkicu i rezerwacji
            // „kończy się za 14 dni" mówiłoby o czymś, co się nie zaczęło.
            const lease = tenant.lease;
            const expiry = resolveLeaseExpiry(
              lease?.status === "ACTIVE" ? lease.endDate : null,
              now,
            );

            return (
              <Card key={tenant.id} className="transition-colors hover:border-muted">
                <Link href={`/panel/najemcy/${tenant.id}`} className="block rounded-card">
                  <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-fg">
                          {tenant.firstName} {tenant.lastName}
                        </p>
                        <Badge tone={TENANT_STATUS_TONE[tenant.status]}>
                          {tenantStatusLabels(d)[tenant.status]}
                        </Badge>
                        {tenant.archivedAt ? <Badge tone="neutral">{t.archivedBadge}</Badge> : null}
                        {/* Odliczanie stoi przy nazwisku, a nie przy kwocie:
                            to termin do zaplanowania, nie stan rozliczeń. */}
                        {expiry ? (
                          <Badge tone={expiry.tone}>
                            <CalendarClock className="h-3 w-3" aria-hidden />
                            {leaseExpiryLabel(expiry, locale, d.panel.leasesPage.expiry)}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        {lease ? (
                          <>
                            {/* Adres ciemniejszy niż e-mail i telefon: po liście
                                szuka się „kto mieszka gdzie", a nie kontaktu. */}
                            <span className="font-medium text-fg">
                              {lease.propertyAddress}
                              {lease.roomName ? ` · ${lease.roomName}` : ""}
                            </span>
                            <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                              {leaseStatusLabels(d)[lease.status]}
                            </Badge>
                          </>
                        ) : (
                          <span>{t.noLease}</span>
                        )}
                        {tenant.email ? <span className="truncate">{tenant.email}</span> : null}
                        {tenant.phone ? <span>{tenant.phone}</span> : null}
                      </p>
                    </div>

                    <div className="text-right">
                      {tenant.outstandingGrosze > 0 ? (
                        <>
                          <p
                            className={`tabular font-mono text-sm font-medium ${
                              tenant.overdueCount > 0 ? "text-bad" : "text-warn"
                            }`}
                          >
                            {formatMoney(tenant.outstandingGrosze, locale)}
                          </p>
                          <p className="text-xs text-muted">
                            {tenant.overdueCount > 0
                              ? fill(t.overdueCount, { count: tenant.overdueCount })
                              : t.toPay}
                          </p>
                        </>
                      ) : (
                        <Badge tone="good">{t.settled}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

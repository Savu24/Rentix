import { Archive, CheckCircle2, ChevronRight, Clock, SearchX, UserPlus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListSearch } from "@/components/panel/list-search";
import { ListSort } from "@/components/panel/list-sort";
import { PageHeader } from "@/components/panel/page-header";
import { SegmentedFilter } from "@/components/panel/segmented-filter";
import { LeaseStatusBadge, TenantStatusBadge } from "@/components/panel/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, pluralize } from "@/lib/i18n/format";
import { leaseExpiryLabel, resolveLeaseExpiry } from "@/lib/leases/expiry";
import { formatMoney } from "@/lib/money";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { listTenants } from "@/lib/tenants/service";
import { cn, initials } from "@/lib/utils";
import {
  tenantListQuerySchema,
  tenantSortLabels,
  TENANT_SORT_OPTIONS,
} from "@/lib/validations/tenant";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.title };
}

/** Kolumny tabeli — te same dla nagłówka i wierszy. */
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.9fr)_164px_18px] lg:items-center lg:gap-5";

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
  const filtered = Boolean(query.q) || query.overdue;

  // Jedna chwila dla całej listy — inaczej dwaj najemcy z tą samą datą końca
  // umowy mogliby dostać różne liczby dni, gdyby render trafił w północ.
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={t.title}
        primary={{ href: "/panel/najemcy/nowy", label: t.add, icon: UserPlus }}
        /* Archiwum obok dodawania, bo to para: jedno chowa, drugie
           przywraca. Schowane w menu byłoby nie do znalezienia. */
        actions={
          <Button asChild variant="ghost">
            <Link href="/panel/najemcy/archiwum">
              <Archive className="size-[18px]" aria-hidden />
              {t.archived}
            </Link>
          </Button>
        }
      />

      {tenants.length === 0 && !filtered ? (
        <EmptyState
          icon={UserPlus}
          title={t.emptyTitle}
          action={
            <Button asChild>
              <Link href="/panel/najemcy/nowy">
                <UserPlus className="size-[18px]" aria-hidden />
                {t.add}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Szukanie, filtr i porządek w jednym wierszu: mówią, co widać na
              liście, a nie co się z nią robi — to zostaje przy przyciskach wyżej. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <Suspense fallback={null}>
              <ListSearch placeholder={t.searchPlaceholder} ariaLabel={t.searchLabel} />
              <SegmentedFilter
                param="overdue"
                ariaLabel={t.filterAria}
                options={[
                  { value: "all", label: t.filterAll },
                  { value: "true", label: t.filterOverdue },
                ]}
              />
            </Suspense>
            <div className="flex items-center justify-between gap-3 lg:ml-auto">
              <span className="text-[13.5px] text-muted lg:order-2">
                {fill(pluralize(locale, tenants.length, t.count), { count: tenants.length })}
                {withDebt > 0 ? fill(t.withDebt, { count: withDebt }) : ""}
              </span>
              <Suspense fallback={null}>
                <ListSort
                  options={TENANT_SORT_OPTIONS}
                  labels={tenantSortLabels(d)}
                  defaultValue="name"
                  ariaLabel={t.sortAria}
                />
              </Suspense>
            </div>
          </div>

          {tenants.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={query.q ? fill(t.noMatchTitle, { query: query.q }) : t.emptyTitle}
              action={
                <Button asChild variant="secondary">
                  <Link href="/panel/najemcy">
                    <X className="size-[18px]" aria-hidden />
                    {d.panel.propertiesPage.filters.clear}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-tile border border-border bg-surface lg:rounded-card">
              <div
                className={cn(
                  COLUMNS,
                  "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted",
                )}
              >
                <span>{t.table.tenant}</span>
                <span>{t.table.place}</span>
                <span>{t.table.lease}</span>
                <span className="text-right">{t.table.toPay}</span>
                <span />
              </div>

              <ul>
                {tenants.map((tenant) => {
                  // Odliczanie tylko dla umowy, która trwa: przy szkicu i rezerwacji
                  // „kończy się za 14 dni" mówiłoby o czymś, co się nie zaczęło.
                  const lease = tenant.lease;
                  const expiry = resolveLeaseExpiry(
                    lease?.status === "ACTIVE" ? lease.endDate : null,
                    now,
                  );
                  const name = `${tenant.firstName} ${tenant.lastName}`;
                  const inDebt = tenant.outstandingGrosze > 0;
                  const place = lease
                    ? `${lease.propertyAddress}${lease.roomName ? `, ${lease.roomName}` : ""}`
                    : null;

                  return (
                    <li key={tenant.id} className="border-t border-border first:border-t-0">
                      <Link
                        href={`/panel/najemcy/${tenant.id}`}
                        className={cn(
                          COLUMNS,
                          "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover lg:min-h-16 lg:px-6",
                        )}
                      >
                        {/* Najemca */}
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full text-[13.5px] font-semibold",
                              inDebt ? "bg-accent2-soft text-accent2" : "bg-accent-soft text-accent",
                            )}
                            aria-hidden
                          >
                            {initials(name)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[14.5px] font-semibold text-fg">{name}</span>
                              {tenant.status !== "ACTIVE" ? (
                                <span className="hidden sm:inline-flex">
                                  <TenantStatusBadge status={tenant.status} d={d} size="sm" />
                                </span>
                              ) : null}
                              {tenant.archivedAt ? (
                                <Badge size="sm">{t.archivedBadge}</Badge>
                              ) : null}
                            </span>
                            <span className="block truncate text-[13px] text-muted">
                              {/* Telefon: lokal w drugiej linii, bo kolumny lokalu nie ma. */}
                              <span className="lg:hidden">{place ?? t.noLease}</span>
                              <span className="hidden font-mono lg:inline">
                                {[tenant.phone, tenant.email].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </span>
                        </span>

                        {/* Lokal */}
                        <span
                          className={cn(
                            "hidden truncate text-sm lg:block",
                            place ? "text-fg" : "text-subtle",
                          )}
                        >
                          {place ?? t.noPlace}
                        </span>

                        {/* Umowa */}
                        <span className="hidden flex-wrap items-center gap-2 lg:flex">
                          {lease ? (
                            <LeaseStatusBadge status={lease.status} d={d} />
                          ) : (
                            <Badge tone="outline">{t.noLease}</Badge>
                          )}
                          {/* Odliczanie przy umowie, a nie przy kwocie:
                              to termin do zaplanowania, nie stan rozliczeń. */}
                          {expiry ? (
                            <Badge
                              tone={expiry.tone === "neutral" ? "neutral" : expiry.tone}
                              icon={Clock}
                              title={leaseExpiryLabel(expiry, locale, d.panel.leasesPage.expiry)}
                            >
                              {expiry.days}
                              {" "}
                              {pluralize(locale, expiry.days, d.panel.leasesPage.expiry.days)}
                            </Badge>
                          ) : null}
                        </span>

                        {/* Do zapłaty */}
                        <span className="shrink-0 text-right">
                          {inDebt ? (
                            <>
                              <span
                                className={cn(
                                  "block font-mono text-[14.5px] font-[650] whitespace-nowrap",
                                  tenant.overdueCount > 0 ? "text-bad" : "text-warn",
                                )}
                              >
                                {formatMoney(tenant.outstandingGrosze, locale)}
                              </span>
                              <span className="hidden text-[12.5px] text-muted sm:block">
                                {tenant.overdueCount > 0
                                  ? fill(t.overdueCount, { count: tenant.overdueCount })
                                  : t.toPay}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2
                                className="size-[18px] text-good lg:hidden"
                                aria-label={t.settled}
                              />
                              <span className="hidden lg:inline-flex">
                                <Badge tone="good" icon={CheckCircle2}>
                                  {t.settled}
                                </Badge>
                              </span>
                            </>
                          )}
                        </span>

                        <ChevronRight
                          className="hidden size-[18px] text-subtle transition-colors group-hover:text-fg lg:block"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

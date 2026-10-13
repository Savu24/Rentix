import { AlertCircle, Archive, ChevronRight, Clock, FilePlus, FileText, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListFilterSelect } from "@/components/panel/list-filter-select";
import { ListSearch } from "@/components/panel/list-search";
import { ListSort } from "@/components/panel/list-sort";
import { PageHeader } from "@/components/panel/page-header";
import { LeaseStatusBadge } from "@/components/panel/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { resolveLeaseExpiry } from "@/lib/leases/expiry";
import { listLeases } from "@/lib/leases/service";
import { formatMoney } from "@/lib/money";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { leaseSortLabels, LEASE_SORT_OPTIONS, leaseListQuerySchema } from "@/lib/validations/lease";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.leasesPage.title };
}

/** Kolumny tabeli — te same dla nagłówka i wierszy. */
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,1fr)_120px_18px] lg:items-center lg:gap-5";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.leasesPage;
  const session = await requireOwnerSession("/panel/umowy");
  const params = await searchParams;

  const parsed = leaseListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : leaseListQuerySchema.parse({});

  const [leases, properties] = await Promise.all([
    listLeases(session.user.organizationId, query),
    // Do filtra tylko nieruchomości, które mają umowy na tej liście — pozycja
    // bez żadnej umowy dawałaby zawsze pusty wynik.
    prisma.property.findMany({
      where: {
        organizationId: session.user.organizationId,
        leases: { some: { archivedAt: null } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const filtered = Boolean(query.q || query.propertyId);
  const active = leases.filter((lease) => lease.status === "ACTIVE").length;
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={t.title}
        primary={{ href: "/panel/umowy/nowa", label: t.add, icon: FilePlus }}
        actions={
          <Button asChild variant="ghost">
            <Link href="/panel/umowy/archiwum">
              <Archive className="size-[18px]" aria-hidden />
              {t.archived}
            </Link>
          </Button>
        }
      />

      {leases.length === 0 && !filtered ? (
        <EmptyState
          icon={FileText}
          title={t.emptyTitle}
          action={
            <Button asChild>
              <Link href="/panel/umowy/nowa">
                <FilePlus className="size-[18px]" aria-hidden />
                {t.add}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Szukanie, nieruchomość i porządek w jednym wierszu, jak przy
              najemcach: wszystkie trzy mówią, co widać na liście. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <Suspense fallback={null}>
              <ListSearch placeholder={t.searchPlaceholder} ariaLabel={t.searchLabel} />
              {properties.length > 1 ? (
                <ListFilterSelect
                  param="propertyId"
                  options={properties.map((property) => ({ value: property.id, label: property.name }))}
                  allLabel={t.allProperties}
                  ariaLabel={t.propertyFilter}
                />
              ) : null}
            </Suspense>
            <div className="flex items-center justify-between gap-3 lg:ml-auto">
              <span className="text-[13.5px] text-muted lg:order-2">
                {fill(pluralize(locale, leases.length, t.count), { count: leases.length })}
                {active > 0 ? fill(t.activeSuffix, { count: active }) : ""}
              </span>
              <Suspense fallback={null}>
                <ListSort
                  options={LEASE_SORT_OPTIONS}
                  labels={leaseSortLabels(d)}
                  defaultValue="status"
                  ariaLabel={t.sortAria}
                />
              </Suspense>
            </div>
          </div>

          {leases.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t.noMatchTitle}
              action={
                <Button asChild variant="secondary">
                  <Link href="/panel/umowy">
                    <X className="size-[18px]" aria-hidden />
                    {d.panel.propertiesPage.filters.clear}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface">
              <div
                className={cn(
                  COLUMNS,
                  "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted",
                )}
              >
                <span>{t.table.unit}</span>
                <span>{t.table.tenants}</span>
                <span>{t.table.period}</span>
                <span>{t.table.status}</span>
                <span className="text-right">{t.table.rent}</span>
                <span />
              </div>

              <ul className="flex flex-col gap-3 lg:gap-0">
                {leases.map((lease) => {
                  const names = lease.tenants
                    .map(({ tenant }) => `${tenant.firstName} ${tenant.lastName}`)
                    .join(", ");
                  const period = `${formatDateIn(lease.startDate, locale, "short")} - ${
                    lease.endDate ? formatDateIn(lease.endDate, locale, "short") : t.openEnded
                  }`;
                  // Odliczanie tylko dla umowy, która trwa — przy szkicu i rezerwacji
                  // „kończy się za 14 dni" mówiłoby o czymś, co się nie zaczęło.
                  const expiry = resolveLeaseExpiry(lease.status === "ACTIVE" ? lease.endDate : null, now);
                  const sub = [lease.room?.name, lease.number ? fill(t.numberPrefix, { number: lease.number }) : null]
                    .filter(Boolean)
                    .join(", ");

                  const badges = (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <LeaseStatusBadge status={lease.status} d={d} />
                      {expiry ? (
                        <Badge tone={expiry.tone === "neutral" ? "neutral" : expiry.tone} icon={Clock}>
                          {expiry.days} {pluralize(locale, expiry.days, t.expiry.days)}
                        </Badge>
                      ) : null}
                      {lease.overdueCount > 0 ? (
                        <Badge tone="critical" icon={AlertCircle}>
                          {fill(pluralize(locale, lease.overdueCount, t.arrears), {
                            count: lease.overdueCount,
                          })}
                        </Badge>
                      ) : null}
                    </span>
                  );

                  return (
                    <li key={lease.id} className="lg:border-t lg:border-border lg:first:border-t-0">
                      <Link
                        href={`/panel/umowy/${lease.id}`}
                        className={cn(
                          COLUMNS,
                          "group flex flex-col gap-2.5 rounded-tile border border-border bg-surface p-4 transition-colors",
                          "lg:min-h-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 lg:py-3 lg:hover:bg-hover",
                        )}
                      >
                        {/* Lokal + na telefonie czynsz w tej samej linii */}
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-fg lg:text-[14.5px]">
                              {lease.property.name}
                            </span>
                            {sub ? (
                              <span className="block truncate font-mono text-[13px] text-muted">{sub}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-mono text-[14.5px] font-semibold whitespace-nowrap text-fg lg:hidden">
                            {formatMoney(lease.rentGrosze, locale)}
                          </span>
                        </span>

                        <span className="truncate text-[13px] text-muted lg:text-sm lg:text-fg">
                          {names}
                        </span>
                        <span className="hidden font-mono text-[13.5px] text-muted lg:block">{period}</span>
                        <span className="hidden lg:block">{badges}</span>

                        {/* Telefon: plakietki po lewej, okres po prawej */}
                        <span className="flex flex-wrap items-center justify-between gap-2 lg:hidden">
                          {badges}
                          <span className="font-mono text-[12.5px] text-subtle">{period}</span>
                        </span>

                        <span className="hidden text-right font-mono text-[14.5px] font-semibold whitespace-nowrap text-fg lg:block">
                          {formatMoney(lease.rentGrosze, locale)}
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

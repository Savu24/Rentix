import { Archive, ChevronRight, KeyRound, SearchX, UserPlus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListSearch } from "@/components/panel/list-search";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, pluralize } from "@/lib/i18n/format";
import { listOwners } from "@/lib/owners/service";
import { panelDictionary, panelLocale, panelValidationContext } from "@/lib/panel/dictionary";
import { cn, initials } from "@/lib/utils";
import { formatContractPeriod, ownerListQuerySchema } from "@/lib/validations/owner";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.title };
}

/** Kolumny tabeli — te same dla nagłówka i wierszy. */
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px_minmax(0,0.9fr)_18px] lg:items-center lg:gap-5";

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/wlasciciele");
  const params = await searchParams;

  const parsed = ownerListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : ownerListQuerySchema.parse({});

  const [owners, dictionary, locale, c] = await Promise.all([
    listOwners(session.user.organizationId, query),
    panelDictionary(),
    panelLocale(),
    panelValidationContext(),
  ]);
  const t = dictionary.panel.ownersPage;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={t.title}
        primary={{ href: "/panel/wlasciciele/nowy", label: t.add, icon: UserPlus }}
        /* Archiwum obok dodawania, bo to para: jedno chowa, drugie
           przywraca. Schowane w menu byłoby nie do znalezienia. */
        actions={
          <Button asChild variant="ghost">
            <Link href="/panel/wlasciciele/archiwum">
              <Archive className="size-[18px]" aria-hidden />
              {t.archived}
            </Link>
          </Button>
        }
      />

      {owners.length === 0 && !query.q ? (
        <EmptyState
          icon={KeyRound}
          title={t.emptyTitle}
          action={
            <Button asChild>
              <Link href="/panel/wlasciciele/nowy">
                <UserPlus className="size-[18px]" aria-hidden />
                {t.add}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Suspense fallback={null}>
              <ListSearch placeholder={t.searchPlaceholder} ariaLabel={t.searchLabel} />
            </Suspense>
            <span className="text-[13.5px] text-muted">
              {fill(pluralize(locale, owners.length, t.noun), { count: owners.length })}
            </span>
          </div>

          {owners.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={fill(t.noMatchTitle, { query: query.q ?? "" })}
              action={
                <Button asChild variant="secondary">
                  <Link href="/panel/wlasciciele">
                    <X className="size-[18px]" aria-hidden />
                    {dictionary.panel.propertiesPage.filters.clear}
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
                <span>{t.table.owner}</span>
                <span>{t.table.contact}</span>
                <span>{t.table.properties}</span>
                <span className="text-right">{t.table.contract}</span>
                <span />
              </div>

              <ul>
                {owners.map((owner) => {
                  const company = Boolean(owner.taxId);
                  const period = formatContractPeriod(
                    owner.contractStartDate,
                    owner.contractEndDate,
                    c,
                  );

                  return (
                    <li key={owner.id} className="border-t border-border first:border-t-0">
                      <Link
                        href={`/panel/wlasciciele/${owner.id}`}
                        className={cn(
                          COLUMNS,
                          "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover lg:min-h-16 lg:px-6",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full text-[13.5px] font-semibold",
                              company ? "bg-info-soft text-info-ink" : "bg-highlight-soft text-warn-ink",
                            )}
                            aria-hidden
                          >
                            {initials(owner.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[14.5px] font-semibold text-fg">
                                {owner.name}
                              </span>
                              {company ? <Badge size="sm">{t.companyBadge}</Badge> : null}
                              {owner.archivedAt ? (
                                <Badge size="sm" tone="warning" icon={Archive}>
                                  {t.archivedBadge}
                                </Badge>
                              ) : null}
                            </span>
                            {/* Telefon: miasto i liczba lokali w drugiej linii. */}
                            <span className="block truncate text-[13px] text-muted lg:hidden">
                              {[
                                owner.city,
                                fill(pluralize(locale, owner.propertyCount, t.propertyCount), {
                                  count: owner.propertyCount,
                                }),
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                            {owner.city ? (
                              <span className="hidden truncate text-[13px] text-muted lg:block">
                                {owner.city}
                              </span>
                            ) : null}
                          </span>
                        </span>

                        <span className="hidden min-w-0 lg:block">
                          <span className="block truncate font-mono text-sm text-fg">
                            {owner.phone ?? ""}
                          </span>
                          <span className="block truncate text-[13px] text-muted">
                            {owner.email ?? ""}
                          </span>
                        </span>

                        <span className="hidden lg:block">
                          <span className="block font-mono text-sm font-semibold text-fg">
                            {owner.propertyCount}
                          </span>
                          {owner.propertyCount > 0 ? (
                            <span className="block text-[13px] text-muted">
                              {fill(t.occupiedCount, { count: owner.occupiedCount })}
                            </span>
                          ) : null}
                        </span>

                        <span className="hidden truncate text-right font-mono text-sm text-muted lg:block">
                          {period ?? ""}
                        </span>

                        <ChevronRight
                          className="size-[18px] shrink-0 text-subtle transition-colors group-hover:text-fg"
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

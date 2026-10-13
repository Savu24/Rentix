import { ChevronLeft, ChevronRight, Mail, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListFilterSelect } from "@/components/panel/list-filter-select";
import { ListSearch } from "@/components/panel/list-search";
import { PageHeader } from "@/components/panel/page-header";
import { SegmentedFilter } from "@/components/panel/segmented-filter";
import { MessageStatusBadge } from "@/components/panel/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, formatDateIn, formatRelativeTime, pluralize } from "@/lib/i18n/format";
import { hasSentEmails, listSentEmails, MESSAGES_PAGE_SIZE } from "@/lib/messages/service";
import { resolveMessageStatus } from "@/lib/messages/status";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";
import { messageListQuerySchema } from "@/lib/validations/message";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.messagesPage.title };
}

/** Szerokości kolumn — wspólne dla nagłówka i wierszy, żeby się nie rozjechały. */
const COLUMNS = "lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_10rem_8.5rem_1.25rem] lg:items-center lg:gap-6";

/**
 * Wysłane e-maile (redesign/17-wiadomosci-lista.svg): do kogo, w jakiej
 * sprawie, czy dotarło i kiedy. Status jako przełącznik nad tabelą.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.messagesPage;
  const session = await requireOwnerSession("/panel/wiadomosci");
  const params = await searchParams;

  const parsed = messageListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : messageListQuerySchema.parse({});
  const organizationId = session.user.organizationId;

  const { rows, total } = await listSentEmails(organizationId, query);
  const filtered = Boolean(query.q) || query.status !== "all" || query.period !== "all";
  const anySent = rows.length > 0 || (await hasSentEmails(organizationId));

  const pages = Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE));
  const now = new Date();

  function pageHref(page: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `/panel/wiadomosci?${qs}` : "/panel/wiadomosci";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title={t.title} />

      {!anySent ? (
        <EmptyState icon={Mail} title={t.emptyTitle} />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <Suspense fallback={null}>
              <ListSearch placeholder={t.searchPlaceholder} ariaLabel={t.searchAria} />
              <SegmentedFilter
                param="status"
                ariaLabel={t.statusAria}
                options={[
                  { value: "all", label: t.filterAll },
                  ...(["delivered", "sent", "failed"] as const).map((value) => ({
                    value,
                    label: t.statusFilters[value],
                  })),
                ]}
              />
            </Suspense>
            <div className="flex items-center justify-between gap-3 lg:ml-auto">
              <Suspense fallback={null}>
                <ListFilterSelect
                  param="period"
                  options={(["7", "30", "90"] as const).map((value) => ({
                    value,
                    label: t.periods[value],
                  }))}
                  allLabel={t.periods.all}
                  ariaLabel={t.periodAria}
                />
              </Suspense>
              <span className="shrink-0 text-[13.5px] whitespace-nowrap text-muted">
                {fill(pluralize(locale, total, t.count), { count: total })}
              </span>
            </div>
          </div>

          {rows.length === 0 && filtered ? (
            <EmptyState
              icon={SearchX}
              title={t.noResultsTitle}
              action={
                <Button asChild variant="secondary">
                  <Link href="/panel/wiadomosci">
                    <X className="size-[18px]" aria-hidden />
                    {d.panel.propertiesPage.filters.clear}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface">
              <div
                className={cn(COLUMNS, "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted")}
                aria-hidden
              >
                <span>{t.columns.to}</span>
                <span>{t.columns.subject}</span>
                <span>{t.columns.status}</span>
                <span className="text-right">{t.columns.sent}</span>
                <span />
              </div>

              <ul className="flex flex-col gap-3 lg:gap-0">
                {rows.map((row) => {
                  const status = resolveMessageStatus(row);
                  const name = row.tenant ? `${row.tenant.firstName} ${row.tenant.lastName}` : null;

                  return (
                    <li key={row.id} className="lg:border-b lg:border-border lg:last:border-b-0">
                      <Link
                        href={`/panel/wiadomosci/${row.id}`}
                        className={cn(
                          COLUMNS,
                          "flex flex-col gap-2 rounded-tile border border-border bg-surface p-4 transition-colors hover:bg-hover",
                          "lg:min-h-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 lg:py-3",
                        )}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold text-fg">{name ?? row.toEmail}</span>
                          {name && row.toEmail ? (
                            <span className="truncate text-[13px] text-muted">{row.toEmail}</span>
                          ) : null}
                        </span>
                        <span className="min-w-0 text-sm text-fg lg:truncate">{row.title}</span>
                        <span className="flex items-center justify-between gap-3 lg:contents">
                          <span>
                            <MessageStatusBadge status={status} d={d} />
                          </span>
                          <time
                            dateTime={row.createdAt.toISOString()}
                            title={formatRelativeTime(row.createdAt, now, locale)}
                            className="font-mono text-[13px] whitespace-nowrap text-muted lg:text-right"
                          >
                            {formatDateIn(row.createdAt, locale, "dateTime")}
                          </time>
                        </span>
                        <ChevronRight className="hidden size-[18px] text-subtle lg:block" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {pages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 lg:border-t lg:border-border lg:px-6 lg:py-3">
                  <span className="text-[13.5px] text-muted">
                    {fill(t.pageOf, { page: query.page, pages })}
                  </span>
                  <div className="flex items-center gap-2">
                    <PageLink href={query.page > 1 ? pageHref(query.page - 1) : null}>
                      <ChevronLeft className="size-4" aria-hidden />
                      {t.newer}
                    </PageLink>
                    <PageLink href={query.page < pages ? pageHref(query.page + 1) : null}>
                      {t.older}
                      <ChevronRight className="size-4" aria-hidden />
                    </PageLink>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Przycisk strony — wyłączony, gdy dalej nie ma już nic do pokazania. */
function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button size="sm" variant="secondary" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="secondary">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

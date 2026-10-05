import { ChevronLeft, ChevronRight, Mail, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListFilterSelect } from "@/components/panel/list-filter-select";
import { ListSearch } from "@/components/panel/list-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, formatDateIn, formatRelativeTime, pluralize } from "@/lib/i18n/format";
import { hasSentEmails, listSentEmails, MESSAGES_PAGE_SIZE } from "@/lib/messages/service";
import { MESSAGE_STATUS_TONE, resolveMessageStatus } from "@/lib/messages/status";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { messageListQuerySchema } from "@/lib/validations/message";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.messagesPage.title };
}

/** Szerokości kolumn — wspólne dla nagłówka i wierszy, żeby się nie rozjechały. */
const COLUMNS = "md:grid md:grid-cols-[minmax(0,1.15fr)_9.5rem_minmax(0,1.6fr)_8.5rem]";

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
        <p className="text-sm text-muted">{t.lead}</p>
      </div>

      {anySent ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <ListSearch placeholder={t.searchPlaceholder} ariaLabel={t.searchAria} />
          <ListFilterSelect
            param="period"
            options={(["7", "30", "90"] as const).map((value) => ({
              value,
              label: t.periods[value],
            }))}
            allLabel={t.periods.all}
            ariaLabel={t.periodAria}
          />
          <ListFilterSelect
            param="status"
            options={(["delivered", "sent", "failed"] as const).map((value) => ({
              value,
              label: t.statusFilters[value],
            }))}
            allLabel={t.allStatuses}
            ariaLabel={t.statusAria}
          />
        </div>
      ) : null}

      {!anySent ? (
        <EmptyState icon={Mail} title={t.emptyTitle} description={t.emptyLead} />
      ) : rows.length === 0 && filtered ? (
        <EmptyState icon={SearchX} title={t.noResultsTitle} description={t.noResultsLead} />
      ) : (
        <Card className="overflow-hidden">
          <div
            className={`hidden border-b border-border bg-surface-alt px-4 py-2.5 text-xs font-medium text-muted ${COLUMNS} md:gap-4`}
            aria-hidden
          >
            <span>{t.columns.to}</span>
            <span>{t.columns.status}</span>
            <span>{t.columns.subject}</span>
            <span className="text-right">{t.columns.sent}</span>
          </div>

          <ul className="flex flex-col">
            {rows.map((row, index) => {
              const status = resolveMessageStatus(row);

              return (
                <li key={row.id} className={index > 0 ? "border-t border-border" : ""}>
                  <Link
                    href={`/panel/wiadomosci/${row.id}`}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-alt ${COLUMNS} md:gap-4`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border bg-surface-alt"
                        aria-hidden
                      >
                        <Mail className="h-4 w-4 text-muted" />
                      </span>
                      <span className="truncate text-sm font-medium text-fg">
                        {row.toEmail ?? "—"}
                      </span>
                    </span>

                    <span className="justify-self-end md:justify-self-start">
                      <Badge tone={MESSAGE_STATUS_TONE[status]}>{t.status[status]}</Badge>
                    </span>

                    <span className="col-span-2 truncate pl-11 text-sm text-muted md:col-span-1 md:pl-0">
                      {row.title}
                    </span>

                    <span
                      className="col-span-2 pl-11 text-xs text-muted md:col-span-1 md:pl-0 md:text-right md:text-sm"
                      title={formatDateIn(row.createdAt, locale, "dateTime")}
                    >
                      <time dateTime={row.createdAt.toISOString()}>
                        {formatRelativeTime(row.createdAt, now, locale)}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {anySent && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            {fill(pluralize(locale, total, t.count), { count: total })}
            {pages > 1 ? ` · ${fill(t.pageOf, { page: query.page, pages })}` : ""}
          </span>

          {pages > 1 ? (
            <div className="flex items-center gap-2">
              {query.page > 1 ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href={pageHref(query.page - 1)}>
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    {t.newer}
                  </Link>
                </Button>
              ) : null}
              {query.page < pages ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href={pageHref(query.page + 1)}>
                    {t.older}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

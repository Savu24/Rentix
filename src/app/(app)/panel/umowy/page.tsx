import { Archive, FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { listLeases } from "@/lib/leases/service";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import {
  leaseStatusLabels,
  LEASE_STATUS_TONE,
  leaseListQuerySchema,
} from "@/lib/validations/lease";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.leasesPage.title };
}

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

  const leases = await listLeases(session.user.organizationId, query);
  const active = leases.filter((lease) => lease.status === "ACTIVE").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">
            {fill(pluralize(locale, leases.length, t.count), { count: leases.length })}
            {active > 0 ? fill(t.activeSuffix, { count: active }) : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/umowy/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              {t.archived}
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/umowy/nowa">
              <Plus className="h-4 w-4" aria-hidden />
              {t.add}
            </Link>
          </Button>
        </div>
      </div>

      {leases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.emptyTitle}
          description={t.emptyLead}
          action={
            <Button asChild>
              <Link href="/panel/umowy/nowa">
                <Plus className="h-4 w-4" aria-hidden />
                {t.addFirst}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {leases.map((lease) => {
            const primary = lease.tenants[0]?.tenant;

            return (
              <Card key={lease.id} className="transition-colors hover:border-muted">
                <Link href={`/panel/umowy/${lease.id}`} className="block rounded-card">
                  <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-fg">
                          {lease.property.name}
                          {lease.room ? ` · ${lease.room.name}` : ""}
                        </p>
                        {lease.room ? <Badge tone="accent">{t.roomLet}</Badge> : null}
                        <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                          {leaseStatusLabels(d)[lease.status]}
                        </Badge>
                        {lease.overdueCount > 0 ? (
                          <Badge tone="critical">
                            {fill(pluralize(locale, lease.overdueCount, t.arrears), {
                              count: lease.overdueCount,
                            })}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        {primary ? (
                          <span>
                            {primary.firstName} {primary.lastName}
                            {lease.tenants.length > 1 ? ` +${lease.tenants.length - 1}` : ""}
                          </span>
                        ) : null}
                        <span>
                          {formatDateIn(lease.startDate, locale, "short")} –{" "}
                          {lease.endDate
                            ? formatDateIn(lease.endDate, locale, "short")
                            : t.openEnded}
                        </span>
                        {lease.number ? <span>{fill(t.numberPrefix, { number: lease.number })}</span> : null}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tabular font-mono text-sm font-medium text-fg">
                        {formatMoney(lease.rentGrosze, locale)}
                      </p>
                      <p className="text-xs text-muted">{t.perMonth}</p>
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

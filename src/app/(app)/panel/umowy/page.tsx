import { Archive, FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { listLeases } from "@/lib/leases/service";
import { formatPLN } from "@/lib/money";
import {
  LEASE_STATUS_LABEL,
  LEASE_STATUS_TONE,
  leaseListQuerySchema,
} from "@/lib/validations/lease";

export const metadata: Metadata = { title: "Umowy" };

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          <h1 className="r-display text-[26px] leading-tight text-fg">Umowy</h1>
          <p className="text-sm text-muted">
            {leases.length} {leases.length === 1 ? "umowa" : "umów"}
            {active > 0 ? ` · ${active} aktywnych` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/umowy/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              Zarchiwizowane
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/umowy/nowa">
              <Plus className="h-4 w-4" aria-hidden />
              Nowa umowa
            </Link>
          </Button>
        </div>
      </div>

      {leases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nie masz jeszcze żadnej umowy"
          description="Umowa łączy jednostkę najmu z najemcą i jest podstawą do naliczania czynszu."
          action={
            <Button asChild>
              <Link href="/panel/umowy/nowa">
                <Plus className="h-4 w-4" aria-hidden />
                Utwórz pierwszą umowę
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
                        {lease.room ? <Badge tone="accent">Najem pokoju</Badge> : null}
                        <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                          {LEASE_STATUS_LABEL[lease.status]}
                        </Badge>
                        {lease.overdueCount > 0 ? (
                          <Badge tone="critical">
                            {lease.overdueCount}{" "}
                            {lease.overdueCount === 1 ? "zaległość" : "zaległości"}
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
                          {dateFormat.format(lease.startDate)} –{" "}
                          {lease.endDate ? dateFormat.format(lease.endDate) : "bezterminowo"}
                        </span>
                        {lease.number ? <span>nr {lease.number}</span> : null}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tabular font-mono text-sm font-medium text-fg">
                        {formatPLN(lease.rentGrosze)}
                      </p>
                      <p className="text-xs text-muted">miesięcznie</p>
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

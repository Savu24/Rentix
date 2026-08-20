import { Archive, CalendarClock, Plus, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { resolveLeaseExpiry } from "@/lib/leases/expiry";
import { formatPLN } from "@/lib/money";
import { listTenants } from "@/lib/tenants/service";
import {
  TENANT_STATUS_LABEL,
  TENANT_STATUS_TONE,
  tenantListQuerySchema,
} from "@/lib/validations/tenant";

export const metadata: Metadata = { title: "Najemcy" };

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          <h1 className="r-display text-[26px] leading-tight text-fg">Najemcy</h1>
          <p className="text-sm text-muted">
            {tenants.length} {tenants.length === 1 ? "najemca" : "najemców"}
            {withDebt > 0 ? ` · ${withDebt} z nierozliczonymi płatnościami` : ""}
          </p>
        </div>

        {/* Archiwum obok dodawania, bo to para: jedno chowa, drugie
            przywraca. Schowane w menu byłoby nie do znalezienia. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/najemcy/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              Zarchiwizowane
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/najemcy/nowy">
              <Plus className="h-4 w-4" aria-hidden />
              Dodaj najemcę
            </Link>
          </Button>
        </div>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nie masz jeszcze żadnego najemcy"
          description="Dodaj profil najemcy, żeby móc podpiąć go pod umowę najmu i wystawiać faktury."
          action={
            <Button asChild>
              <Link href="/panel/najemcy/nowy">
                <Plus className="h-4 w-4" aria-hidden />
                Dodaj najemcę
              </Link>
            </Button>
          }
        />
      ) : (
        /* Karty, nie tabela — na telefonie wiersz z sześcioma kolumnami
           byłby nieczytelny, a to widok używany w biegu. */
        <div className="flex flex-col gap-2">
          {tenants.map((tenant) => {
            const expiry = resolveLeaseExpiry(tenant.activeLease?.endDate, now);

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
                          {TENANT_STATUS_LABEL[tenant.status]}
                        </Badge>
                        {tenant.archivedAt ? <Badge tone="neutral">Zarchiwizowany</Badge> : null}
                        {/* Odliczanie stoi przy nazwisku, a nie przy kwocie:
                            to termin do zaplanowania, nie stan rozliczeń. */}
                        {expiry ? (
                          <Badge tone={expiry.tone}>
                            <CalendarClock className="h-3 w-3" aria-hidden />
                            {expiry.label}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        {tenant.activeLease ? (
                          <span>
                            {tenant.activeLease.propertyName}
                            {tenant.activeLease.roomName
                              ? ` · ${tenant.activeLease.roomName}`
                              : ""}
                          </span>
                        ) : (
                          <span>Bez aktywnej umowy</span>
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
                            {formatPLN(tenant.outstandingGrosze)}
                          </p>
                          <p className="text-xs text-muted">
                            {tenant.overdueCount > 0
                              ? `${tenant.overdueCount} po terminie`
                              : "do zapłaty"}
                          </p>
                        </>
                      ) : (
                        <Badge tone="good">Rozliczony</Badge>
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

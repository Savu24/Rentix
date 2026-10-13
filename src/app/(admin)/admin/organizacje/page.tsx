import { AlertCircle, Building2, Check, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminFilters } from "@/components/admin/admin-filters";
import { PlanBadge } from "@/components/admin/plan-badge";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminOrganizations } from "@/lib/admin/organizations";
import { requireAdminSession } from "@/lib/admin/session";
import { cn } from "@/lib/utils";
import { PLAN_LABELS, organizationSearchSchema, STATUS_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Organizacje" };

const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

const COLUMNS = "lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_9rem_1.25rem] lg:items-center lg:gap-6";

/** Wszystkie konta platformy (redesign/24-admin-organizacje.svg). */
export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/organizacje");

  const params = await searchParams;
  const parsed = organizationSearchSchema.safeParse(params);
  // Nieznany filtr w adresie nie ma wywalać strony — wtedy lista bez filtrów.
  const search = parsed.success ? parsed.data : organizationSearchSchema.parse({});

  const organizations = await listAdminOrganizations(search);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organizacje" />

      <Suspense fallback={null}>
        <AdminFilters
          placeholder="Nazwa, slug, NIP albo e-mail"
          total={organizations.length}
          totalLabel={organizations.length === 1 ? "organizacja" : "organizacji"}
          segmented={{
            key: "plan",
            label: "Plan",
            allLabel: "Wszystkie",
            options: Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label })),
          }}
          selects={[
            {
              key: "status",
              label: "Status subskrypcji",
              allLabel: "Każdy status",
              options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            },
          ]}
        />
      </Suspense>

      {organizations.length === 0 ? (
        <EmptyState icon={Building2} title="Nic nie pasuje" />
      ) : (
        <div className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface">
          <div className={cn(COLUMNS, "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted")} aria-hidden>
            <span>Organizacja</span>
            <span>Plan</span>
            <span>Umowy</span>
            <span className="text-right">Założona</span>
            <span />
          </div>

          <ul className="flex flex-col gap-3 lg:gap-0">
            {organizations.map((organization) => {
              const { usage } = organization;
              /*
                Konto ponad progiem to nie błąd danych: limit da się obniżyć
                komuś, kto ma już więcej umów, i wtedy panel klienta po prostu
                nie pozwala dołożyć kolejnej. Tutaj ma być widać od razu, bo to
                zwykle powód telefonu do obsługi.
              */
              const overLimit = usage.limit !== null && usage.used > usage.limit;

              return (
                <li key={organization.id} className="lg:border-b lg:border-border lg:last:border-b-0">
                  <Link
                    href={`/admin/organizacje/${organization.id}`}
                    className={cn(
                      COLUMNS,
                      "flex flex-col gap-2.5 rounded-tile border border-border bg-surface p-4 transition-colors hover:bg-hover",
                      "lg:min-h-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 lg:py-3",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-fg">{organization.name}</span>
                      <span className="truncate text-[13px] text-muted">
                        {organization.ownerEmail ?? "konto bez właściciela"} · /o/{organization.slug}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-1.5">
                      <PlanBadge plan={usage.plan} />
                      {organization.status !== "ACTIVE" ? (
                        <Badge tone={organization.status === "PAST_DUE" ? "warning" : "critical"} size="sm" icon={AlertCircle}>
                          {STATUS_LABELS[organization.status]}
                        </Badge>
                      ) : null}
                      {organization.billingExempt ? (
                        <Badge tone="good" size="sm" icon={Check}>
                          Bez opłat
                        </Badge>
                      ) : null}
                    </span>

                    <span className={cn("font-mono text-sm font-semibold", overLimit ? "text-bad" : "text-fg")}>
                      {usage.used}
                      <span className="font-normal text-subtle">/{usage.limit ?? "∞"}</span>
                      <span className="font-sans font-normal text-muted lg:hidden"> umów</span>
                    </span>

                    <span className="font-mono text-[13px] text-muted lg:text-right">
                      {organization.locale.toUpperCase()} · {day.format(organization.createdAt)}
                    </span>

                    <ChevronRight className="hidden size-[18px] text-subtle lg:block" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminFilters } from "@/components/admin/admin-filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminOrganizations } from "@/lib/admin/organizations";
import { requireAdminSession } from "@/lib/admin/session";
import { PLAN_LABELS, organizationSearchSchema, STATUS_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Organizacje" };

const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">Organizacje</h1>
        <p className="text-sm text-muted">
          Wszystkie konta platformy. Szukaj po nazwie, adresie strony, NIP-ie albo e-mailu osoby
          z zespołu.
        </p>
      </div>

      <AdminFilters
        placeholder="Nazwa, slug, NIP albo e-mail"
        total={organizations.length}
        totalLabel={organizations.length === 1 ? "organizacja" : "organizacji"}
        selects={[
          {
            key: "plan",
            label: "Plan",
            allLabel: "Każdy plan",
            options: Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: "status",
            label: "Status subskrypcji",
            allLabel: "Każdy status",
            options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nic nie pasuje"
          description="Żadne konto nie odpowiada tym filtrom. Wyczyść wyszukiwanie i spróbuj inaczej."
        />
      ) : (
        <div className="flex flex-col gap-2">
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
              <Card key={organization.id}>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/organizacje/${organization.id}`}
                      className="text-sm font-medium text-fg hover:text-accent"
                    >
                      {organization.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {organization.ownerEmail ?? "konto bez właściciela"} · /o/{organization.slug}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{PLAN_LABELS[usage.plan]}</Badge>

                    {organization.status !== "ACTIVE" ? (
                      <Badge tone={organization.status === "PAST_DUE" ? "warning" : "critical"}>
                        {STATUS_LABELS[organization.status]}
                      </Badge>
                    ) : null}

                    {organization.billingExempt ? <Badge tone="good">Bez opłat</Badge> : null}

                    <span
                      className={
                        overLimit ? "text-xs font-medium text-bad" : "text-xs text-muted"
                      }
                    >
                      {usage.used}/{usage.limit ?? "∞"} umów
                    </span>

                    <span className="text-xs text-muted">
                      {organization.locale.toUpperCase()} · {day.format(organization.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

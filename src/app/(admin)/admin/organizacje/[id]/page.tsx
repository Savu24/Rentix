import { AlertCircle, Check, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanBadge } from "@/components/admin/plan-badge";
import { StatPlate } from "@/components/admin/stat-tile";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { PageHeader } from "@/components/panel/page-header";
import { SectionCard } from "@/components/panel/section-card";
import { Badge } from "@/components/ui/badge";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { getAdminOrganization } from "@/lib/admin/organizations";
import { requireAdminSession } from "@/lib/admin/session";
import { formatMoney } from "@/lib/money";
import { ADMIN_ACTION_LABELS, STATUS_LABELS, USER_ROLE_LABELS } from "@/lib/validations/admin";

type Params = { params: Promise<{ id: string }> };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
const number = new Intl.NumberFormat("pl-PL");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const organization = await getAdminOrganization(id);
  return { title: organization?.name ?? "Organizacja" };
}

/** Karta jednego konta (redesign/24-admin-organizacja-karta.svg). */
export default async function AdminOrganizationPage({ params }: Params) {
  const { id } = await params;
  await requireAdminSession(`/admin/organizacje/${id}`);

  const [organization, history] = await Promise.all([
    getAdminOrganization(id),
    listAdminAuditLog({ target: { type: "ORGANIZATION", id }, limit: 20 }),
  ]);

  if (!organization) notFound();

  const { usage } = organization;

  const details: [string, string][] = [
    ["Właściciel", organization.ownerEmail ?? "konto bez właściciela"],
    ["Adres publiczny", `/o/${organization.slug}`],
    ["Wersja krajowa", organization.locale.toUpperCase()],
    ["Założona", day.format(organization.createdAt)],
    ["E-mail kontaktowy", organization.contactEmail ?? "-"],
    ["NIP", organization.taxId ?? "-"],
    ["Miasto", organization.city ?? "-"],
    ["Rachunek", organization.bankAccount ?? "-"],
    ["Okres opłacony do", organization.currentPeriodEnd ? day.format(organization.currentPeriodEnd) : "-"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/organizacje", label: "Organizacje" }}
        title={organization.name}
        badges={
          <>
            <PlanBadge plan={usage.plan} size="md" />
            {organization.status !== "ACTIVE" ? (
              <Badge tone={organization.status === "PAST_DUE" ? "warning" : "critical"} icon={AlertCircle}>
                {STATUS_LABELS[organization.status]}
              </Badge>
            ) : null}
            {organization.billingExempt ? (
              <Badge tone="good" icon={Check}>
                Bez opłat
              </Badge>
            ) : null}
          </>
        }
      />

      <StatPlate
        stats={[
          {
            label: "Umowy",
            value: `${number.format(usage.used)} / ${usage.limit === null ? "∞" : number.format(usage.limit)}`,
            hint: `${organization.counts.leasesArchived} w archiwum`,
          },
          { label: "Nieruchomości", value: number.format(organization.counts.properties) },
          {
            label: "Najemcy",
            value: number.format(organization.counts.tenants),
            hint: `${organization.counts.payments} zapisanych wpłat`,
          },
          {
            label: "Faktury",
            value: number.format(organization.counts.invoices),
            hint: `${formatMoney(organization.invoicedGrosze, organization.locale)} brutto łącznie`,
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Dane konta" bodyClassName="pt-1">
          <dl className="flex flex-col divide-y divide-border">
            {details.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="shrink-0 text-sm text-muted">{label}</dt>
                <dd className="min-w-0 text-right text-sm font-semibold [overflow-wrap:anywhere] text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SubscriptionForm
          organizationId={organization.id}
          organizationName={organization.name}
          used={usage.used}
          initial={{
            plan: usage.plan,
            leaseLimit: organization.usage.limit,
            billingExempt: organization.billingExempt,
            status: organization.status,
          }}
        />

        <SectionCard title="Zespół" icon={Users} count={organization.members} bodyClassName="pt-1">
          <ul className="flex flex-col divide-y divide-border">
            {organization.memberList.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold [overflow-wrap:anywhere] text-fg">{member.name ?? member.email}</span>
                  <span className="text-[13px] [overflow-wrap:anywhere] text-muted">
                    {member.email} ·{" "}
                    {member.lastLoginAt ? `ostatnio ${day.format(member.lastLoginAt)}` : "nigdy nie zalogowany"}
                  </span>
                </div>
                <span className="text-sm text-muted">
                  {member.role === "OWNER" ? "Właściciel konta" : member.role === "ADMIN" ? "Administrator" : "Współpracownik"}
                </span>
                {/* Rola platformy pokazuje się tylko wtedy, gdy odbiega od
                    zwykłego wynajmującego — inaczej byłby to szum w każdym wierszu. */}
                {member.platformRole !== "OWNER" ? (
                  <Badge tone="warning" size="sm">
                    {USER_ROLE_LABELS[member.platformRole]}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Historia zmian" bodyClassName="pt-1">
          {history.length === 0 ? (
            <p className="py-2 text-sm text-muted">Nikt nie zmieniał tego konta z panelu administratora.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-3">
                  <span className="text-sm font-semibold text-fg">
                    {ADMIN_ACTION_LABELS[entry.action]}: {entry.before ?? "-"} → {entry.after ?? "-"}
                  </span>
                  <span className="text-[13px] text-muted">
                    {stamp.format(entry.createdAt)}, {entry.actorEmail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

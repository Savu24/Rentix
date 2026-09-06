import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatTile } from "@/components/admin/stat-tile";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { getAdminOrganization } from "@/lib/admin/organizations";
import { requireAdminSession } from "@/lib/admin/session";
import { formatMoney } from "@/lib/money";
import {
  ADMIN_ACTION_LABELS,
  PLAN_LABELS,
  STATUS_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/validations/admin";

type Params = { params: Promise<{ id: string }> };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const organization = await getAdminOrganization(id);
  return { title: organization?.name ?? "Organizacja" };
}

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
    ["Adres publiczny", `/o/${organization.slug}`],
    ["Wersja krajowa", organization.locale.toUpperCase()],
    ["Założona", day.format(organization.createdAt)],
    ["E-mail kontaktowy", organization.contactEmail ?? "—"],
    ["NIP", organization.taxId ?? "—"],
    ["Miasto", organization.city ?? "—"],
    ["Rachunek", organization.bankAccount ?? "—"],
    [
      "Okres opłacony do",
      organization.currentPeriodEnd ? day.format(organization.currentPeriodEnd) : "—",
    ],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/organizacje"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Wszystkie organizacje
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="r-display text-[26px] leading-tight text-fg">{organization.name}</h1>
          <Badge tone="accent">{PLAN_LABELS[usage.plan]}</Badge>
          {organization.status !== "ACTIVE" ? (
            <Badge tone={organization.status === "PAST_DUE" ? "warning" : "critical"}>
              {STATUS_LABELS[organization.status]}
            </Badge>
          ) : null}
          {organization.billingExempt ? <Badge tone="good">Bez opłat</Badge> : null}
        </div>

        <p className="text-sm text-muted">
          {organization.ownerEmail ?? "konto bez właściciela"} · {organization.members}{" "}
          {organization.members === 1 ? "osoba w zespole" : "osób w zespole"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Umowy"
          value={`${usage.used} / ${usage.limit ?? "∞"}`}
          hint={`${organization.counts.leasesArchived} w archiwum`}
        />
        <StatTile label="Nieruchomości" value={organization.counts.properties} />
        <StatTile
          label="Najemcy"
          value={organization.counts.tenants}
          hint={`${organization.counts.payments} zapisanych wpłat`}
        />
        <StatTile
          label="Faktury"
          value={organization.counts.invoices}
          hint={`${formatMoney(organization.invoicedGrosze, organization.locale)} brutto łącznie`}
        />
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Dane konta</h2>

            <dl className="flex flex-col">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Zespół</h2>

            <ul className="flex flex-col">
              {organization.memberList.map((member) => (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{member.name ?? member.email}</p>
                    <p className="truncate text-xs text-muted">
                      {member.email} ·{" "}
                      {member.lastLoginAt
                        ? `ostatnio ${day.format(member.lastLoginAt)}`
                        : "nigdy nie zalogowany"}
                    </p>
                  </div>

                  <Badge tone={member.role === "OWNER" ? "accent" : "neutral"}>
                    {member.role === "OWNER"
                      ? "Właściciel"
                      : member.role === "ADMIN"
                        ? "Administrator"
                        : "Członek"}
                  </Badge>

                  {/* Rola platformy pokazuje się tylko wtedy, gdy odbiega od
                      zwykłego wynajmującego — inaczej byłby to szum w każdym wierszu. */}
                  {member.platformRole !== "OWNER" ? (
                    <Badge tone="warning">{USER_ROLE_LABELS[member.platformRole]}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Historia zmian</h2>

          {history.length === 0 ? (
            <p className="text-sm text-muted">
              Nikt nie zmieniał tego konta z panelu administratora.
            </p>
          ) : (
            <ul className="flex flex-col">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border py-2.5 text-sm last:border-b-0"
                >
                  <span className="text-fg">{ADMIN_ACTION_LABELS[entry.action]}</span>
                  <span className="text-muted">
                    {entry.before ?? "—"} → {entry.after ?? "—"}
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {entry.actorEmail} · {stamp.format(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

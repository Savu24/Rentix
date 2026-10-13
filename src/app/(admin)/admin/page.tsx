import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { SectionCard } from "@/components/panel/section-card";
import { PlanBadge } from "@/components/admin/plan-badge";
import { StatPlate, type Stat } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { MoneyDisplay } from "@/components/ui/money-display";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";
import { platformStats, recentSignups } from "@/lib/admin/stats";
import { LOCALE_META } from "@/lib/i18n/config";
import { ADMIN_ACTION_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Przegląd" };

/** Data i godzina w jednym formacie w całym panelu administratora. */
const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" });
const number = new Intl.NumberFormat("pl-PL");

/** Przegląd platformy (redesign/24-admin-przeglad.svg). */
export default async function AdminOverviewPage() {
  await requireAdminSession();

  const [stats, signups, audit] = await Promise.all([
    platformStats(),
    recentSignups(6),
    listAdminAuditLog({ limit: 6 }),
  ]);

  const paying = stats.revenue.reduce((sum, line) => sum + line.accounts, 0);

  const tiles: Stat[] = [
    {
      label: "Organizacje",
      value: number.format(stats.organizations),
      badge: `+${stats.organizationsLast30Days} w 30 dni`,
    },
    { label: "Konta", value: number.format(stats.users), hint: `${stats.tenantAccounts} najemców, ${stats.admins} administratorów` },
    {
      label: "Umowy poza archiwum",
      value: number.format(stats.leases),
      hint: `${stats.properties} nieruchomości, ${stats.tenants} kartotek najemców`,
    },
    { label: "Faktury (30 dni)", value: number.format(stats.invoicesLast30Days) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Przegląd platformy" meta={<span>Stan na {stamp.format(new Date())}</span>} />

      <StatPlate stats={tiles} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Przychód miesięczny"
          count={`${paying} płacących`}
          actions={
            <InfoTip label="Jak liczony jest przychód" align="end">
              Kwoty z cennika, liczone z aktywnych subskrypcji poza zwolnionymi z opłat ({stats.billingExempt}).
              Operatora płatności jeszcze nie ma, więc to plan przychodu, a nie wpływy. Waluty stoją osobno
              i nigdy się nie sumują.
            </InfoTip>
          }
        >
          {/*
            Waluty stoją osobno i nigdy się nie sumują: kurs zmienia się co
            dzień, a suma po kursie z dziś nie znaczyłaby nic ani jutro, ani
            w zestawieniu z zeszłym miesiącem.
          */}
          <ul className="flex flex-col divide-y divide-border">
            {stats.revenue.map((line) => (
              <li key={line.locale} className="flex items-center justify-between gap-4 py-3 first:pt-1">
                <span className="text-sm text-muted">
                  {LOCALE_META[line.locale].currency} · {line.accounts} {line.accounts === 1 ? "konto" : "kont"}
                </span>
                <MoneyDisplay grosze={line.amount} locale={line.locale} className="text-[26px] tracking-[-0.5px] text-fg" />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Konta w planach">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-5 py-2 sm:grid-cols-4">
            {stats.plans.map((row) => (
              <li key={row.plan} className="flex flex-col items-start gap-2">
                <span className="font-mono text-[30px] leading-9 font-[650] text-fg">{number.format(row.organizations)}</span>
                <PlanBadge plan={row.plan} />
                <span className="font-mono text-[12.5px] text-subtle">{row.sharePercent}%</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Ostatnie rejestracje" bodyClassName="pt-1">
          {signups.length === 0 ? (
            <p className="py-2 text-sm text-muted">Jeszcze nikt się nie zarejestrował.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {signups.map((signup) => (
                <li key={signup.id} className="flex items-center gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/admin/organizacje/${signup.id}`}
                      className="truncate text-sm font-semibold text-fg hover:text-accent hover:underline"
                    >
                      {signup.name}
                    </Link>
                    <span className="truncate text-[13px] text-muted">{signup.ownerEmail ?? "konto bez właściciela"}</span>
                  </div>
                  <Badge size="sm">{signup.locale.toUpperCase()}</Badge>
                  <span className="w-16 shrink-0 text-right font-mono text-[13px] text-muted">{day.format(signup.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Ostatnie zmiany"
          actions={
            <Link href="/admin/dziennik" className="text-[13px] font-semibold text-accent hover:underline">
              Cały dziennik
            </Link>
          }
          bodyClassName="pt-1"
        >
          {audit.length === 0 ? (
            <p className="py-2 text-sm text-muted">Nikt jeszcze niczego stąd nie zmienił.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {audit.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-fg">{ADMIN_ACTION_LABELS[entry.action]}</span>
                    <span className="truncate text-[13px] text-muted">{entry.targetLabel}</span>
                  </div>
                  <span className="shrink-0 text-right font-mono text-[13px] text-muted">{stamp.format(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

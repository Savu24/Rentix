import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";
import { platformStats, recentSignups } from "@/lib/admin/stats";
import { LOCALE_META } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";
import { ADMIN_ACTION_LABELS, PLAN_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Przegląd" };

/** Data i godzina w jednym formacie w całym panelu administratora. */
const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function AdminOverviewPage() {
  await requireAdminSession();

  const [stats, signups, audit] = await Promise.all([
    platformStats(),
    recentSignups(6),
    listAdminAuditLog({ limit: 6 }),
  ]);

  const paying = stats.revenue.reduce((sum, line) => sum + line.accounts, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">Przegląd platformy</h1>
        <p className="text-sm text-muted">
          Stan na {stamp.format(new Date())}. Liczby obejmują wszystkie konta.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Organizacje"
          value={stats.organizations}
          hint={`+${stats.organizationsLast30Days} w ostatnich 30 dniach`}
        />
        <StatTile
          label="Konta"
          value={stats.users}
          hint={`${stats.tenantAccounts} najemców, ${stats.admins} administratorów`}
        />
        <StatTile
          label="Umowy poza archiwum"
          value={stats.leases}
          hint={`${stats.properties} nieruchomości, ${stats.tenants} kartotek najemców`}
        />
        <StatTile
          label="Faktury (30 dni)"
          value={stats.invoicesLast30Days}
          hint="Wystawione przez wszystkie konta"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-fg">Przychód miesięczny</h2>
              <span className="text-xs text-muted">{paying} kont płacących</span>
            </div>

            {/*
              Waluty stoją osobno i nigdy się nie sumują: kurs zmienia się co
              dzień, a suma po kursie z dziś nie znaczyłaby nic ani jutro, ani
              w zestawieniu z zeszłym miesiącem.
            */}
            <div className="flex flex-col gap-2">
              {stats.revenue.map((line) => (
                <div
                  key={line.locale}
                  className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-muted">
                    {LOCALE_META[line.locale].currency} · {line.accounts}{" "}
                    {line.accounts === 1 ? "konto" : "kont"}
                  </span>
                  <span className="r-display text-[18px] text-fg">
                    {formatMoney(line.amount, line.locale)}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted">
              Kwoty z cennika, liczone z aktywnych subskrypcji poza zwolnionymi z opłat
              ({stats.billingExempt}). Operatora płatności jeszcze nie ma, więc to plan
              przychodu, a nie wpływy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Konta w planach</h2>

            <div className="flex flex-col gap-2">
              {stats.plans.map((row) => {
                const share =
                  stats.organizations === 0
                    ? 0
                    : Math.round((row.organizations / stats.organizations) * 100);

                return (
                  <div key={row.plan} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg">{PLAN_LABELS[row.plan]}</span>
                      <span className="text-muted">
                        {row.organizations} · {share}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Ostatnie rejestracje</h2>

            {signups.length === 0 ? (
              <p className="text-sm text-muted">Jeszcze nikt się nie zarejestrował.</p>
            ) : (
              <ul className="flex flex-col">
                {signups.map((signup) => (
                  <li
                    key={signup.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/organizacje/${signup.id}`}
                        className="text-sm font-medium text-fg hover:text-accent"
                      >
                        {signup.name}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {signup.ownerEmail ?? "konto bez właściciela"}
                      </p>
                    </div>
                    <Badge>{signup.locale.toUpperCase()}</Badge>
                    <span className="text-xs text-muted">{day.format(signup.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-fg">Ostatnie zmiany</h2>
              <Link href="/admin/dziennik" className="text-xs text-accent hover:underline">
                Cały dziennik
              </Link>
            </div>

            {audit.length === 0 ? (
              <p className="text-sm text-muted">
                Nikt jeszcze niczego stąd nie zmienił. Każda zmiana zostawia tu ślad.
              </p>
            ) : (
              <ul className="flex flex-col">
                {audit.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border py-2.5 last:border-b-0 last:pb-0"
                  >
                    <span className="text-sm text-fg">{ADMIN_ACTION_LABELS[entry.action]}</span>
                    <span className="text-sm text-muted">· {entry.targetLabel}</span>
                    <span className="ml-auto text-xs text-muted">
                      {stamp.format(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

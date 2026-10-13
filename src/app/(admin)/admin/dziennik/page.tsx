import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTip } from "@/components/ui/info-tip";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";
import { cn } from "@/lib/utils";
import { ADMIN_ACTION_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Dziennik" };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const COLUMNS = "lg:grid lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)_14rem] lg:items-center lg:gap-6";

/**
 * Sto ostatnich zmian wykonanych z panelu administratora
 * (redesign/24-admin-dziennik.svg).
 */
export default async function AdminAuditPage() {
  await requireAdminSession("/admin/dziennik");

  const entries = await listAdminAuditLog({ limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Dziennik
            <InfoTip label="Co zapisuje dziennik">
              Sto ostatnich zmian wykonanych z panelu administratora. Wpisy zostają także po skasowaniu konta albo
              organizacji, której dotyczyły, stąd nazwy zapisane tekstem, a nie odczytane relacją.
            </InfoTip>
          </span>
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="Dziennik jest pusty" />
      ) : (
        <div className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface">
          <div className={cn(COLUMNS, "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted")} aria-hidden>
            <span>Zmiana</span>
            <span>Czego dotyczy</span>
            <span>Przed i po</span>
            <span className="text-right">Kto i kiedy</span>
          </div>
          <ul className="flex flex-col gap-3 lg:gap-0">
            {entries.map((entry) => {
              const href = entry.targetType === "ORGANIZATION" ? `/admin/organizacje/${entry.targetId}` : null;

              return (
                <li
                  key={entry.id}
                  className={cn(
                    COLUMNS,
                    "flex flex-col gap-2 rounded-tile border border-border bg-surface p-4",
                    "lg:min-h-14 lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:bg-transparent lg:px-6 lg:py-3 lg:last:border-b-0",
                  )}
                >
                  <span>
                    <Badge tone={entry.targetType === "ORGANIZATION" ? "accent" : "neutral"} size="sm">
                      {ADMIN_ACTION_LABELS[entry.action]}
                    </Badge>
                  </span>
                  {href ? (
                    <Link href={href} className="min-w-0 truncate text-sm font-semibold text-fg hover:text-accent hover:underline">
                      {entry.targetLabel}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate text-sm font-semibold text-fg">{entry.targetLabel}</span>
                  )}
                  <span className="text-sm text-muted">
                    {entry.before ?? "-"} → {entry.after ?? "-"}
                  </span>
                  <span className="flex flex-col text-[13px] text-muted lg:text-right">
                    <span className="truncate">{entry.actorEmail}</span>
                    <span className="font-mono text-subtle">{stamp.format(entry.createdAt)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

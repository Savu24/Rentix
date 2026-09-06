import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminAuditLog } from "@/lib/admin/audit";
import { requireAdminSession } from "@/lib/admin/session";
import { ADMIN_ACTION_LABELS } from "@/lib/validations/admin";

export const metadata: Metadata = { title: "Dziennik" };

const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminAuditPage() {
  await requireAdminSession("/admin/dziennik");

  const entries = await listAdminAuditLog({ limit: 100 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">Dziennik</h1>
        <p className="text-sm text-muted">
          Sto ostatnich zmian wykonanych z panelu administratora. Wpisy zostają także po
          skasowaniu konta albo organizacji, której dotyczyły — stąd nazwy zapisane tekstem,
          a nie odczytane relacją.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Dziennik jest pusty"
          description="Nikt jeszcze niczego stąd nie zmienił. Każda zmiana planu, limitu czy roli zostawi tu ślad."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col">
            {entries.map((entry) => {
              const href =
                entry.targetType === "ORGANIZATION"
                  ? `/admin/organizacje/${entry.targetId}`
                  : null;

              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0"
                >
                  <Badge tone={entry.targetType === "ORGANIZATION" ? "accent" : "neutral"}>
                    {ADMIN_ACTION_LABELS[entry.action]}
                  </Badge>

                  {href ? (
                    <Link href={href} className="text-sm text-fg hover:text-accent">
                      {entry.targetLabel}
                    </Link>
                  ) : (
                    <span className="text-sm text-fg">{entry.targetLabel}</span>
                  )}

                  <span className="text-sm text-muted">
                    {entry.before ?? "—"} → {entry.after ?? "—"}
                  </span>

                  <span className="ml-auto text-xs text-muted">
                    {entry.actorEmail} · {stamp.format(entry.createdAt)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

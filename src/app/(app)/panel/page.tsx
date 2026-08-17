import { ArrowRight, Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { overdueWhere } from "@/lib/invoices/status";
import { formatPLN } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pulpit" };

export default async function OwnerDashboardPage() {
  const session = await requireOwnerSession("/panel");
  const organizationId = session.user.organizationId;

  const [propertyCount, roomCount, occupiedCount, overdue] = await Promise.all([
    prisma.property.count({ where: { organizationId, archivedAt: null } }),
    prisma.room.count({ where: { organizationId, archivedAt: null } }),
    prisma.room.count({ where: { organizationId, archivedAt: null, status: "OCCUPIED" } }),
    prisma.invoice.aggregate({
      where: { organizationId, ...overdueWhere() },
      _sum: { totalGrossGrosze: true, paidGrosze: true },
      _count: true,
    }),
  ]);

  const overdueGrosze =
    (overdue._sum.totalGrossGrosze ?? 0) - (overdue._sum.paidGrosze ?? 0);
  const occupancy = roomCount > 0 ? Math.round((occupiedCount / roomCount) * 100) : 0;

  const firstName = session.user.name?.split(" ")[0] ?? "właścicielu";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">Cześć, {firstName}</h1>
          <p className="text-sm text-muted">
            {new Intl.DateTimeFormat("pl-PL", { dateStyle: "full" }).format(new Date())}
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/panel/nieruchomosci/nowa">
            <Plus className="h-4 w-4" aria-hidden />
            Dodaj nieruchomość
          </Link>
        </Button>
      </div>

      {propertyCount === 0 ? (
        <EmptyState
          icon={Building2}
          title="Zacznij od pierwszej nieruchomości"
          description="Dodaj mieszkanie lub dom, a potem jednostki najmu. Reszta — najemcy, umowy, faktury — podepnie się pod nie."
          action={
            <Button asChild>
              <Link href="/panel/nieruchomosci/nowa">
                <Plus className="h-4 w-4" aria-hidden />
                Dodaj nieruchomość
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Nieruchomości" value={String(propertyCount)} />
            <StatTile label="Pokoje" value={String(roomCount)} />
            <StatTile
              label="Obłożenie"
              value={`${occupancy}%`}
              hint={`${occupiedCount} z ${roomCount} zajętych`}
            />
            <StatTile
              label="Zaległości"
              value={formatPLN(Math.max(0, overdueGrosze))}
              hint={
                overdue._count > 0
                  ? `${overdue._count} ${overdue._count === 1 ? "faktura" : "faktur"} po terminie`
                  : "Wszystko rozliczone"
              }
              tone={overdueGrosze > 0 ? "critical" : "good"}
            />
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-semibold text-fg">Nieruchomości</p>
                <p className="text-sm text-muted">
                  Zarządzaj obiektami i jednostkami najmu.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/panel/nieruchomosci">
                  Przejdź do listy
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "critical";
}) {
  const hintColor =
    tone === "critical" ? "text-bad" : tone === "good" ? "text-good" : "text-muted";

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted">{label}</p>
        {/*
          tabular-nums, żeby kwoty w sąsiednich kafelkach nie skakały.

          Rozmiar skaluje się z szerokością ekranu, bo kafelki stoją po dwa
          w rzędzie już od najwęższego telefonu. Stałe 22px sprawiało, że
          „5 900,00 zł" w monospace nie mieściło się w kafelku i rozpychało
          siatkę, a przez nią całą stronę w poziomie — pasek przewijania
          pojawiał się na pulpicie. Kwoty nie wolno zawijać ani przycinać,
          więc zmienia się typografia, a nie treść.
        */}
        <p className="font-mono text-[clamp(15px,4.6vw,22px)] font-medium tabular text-fg">
          {value}
        </p>
        {hint ? <p className={`text-xs ${hintColor}`}>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

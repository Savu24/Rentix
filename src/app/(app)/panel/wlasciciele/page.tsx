import { KeyRound, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwners } from "@/lib/owners/service";
import { plural } from "@/lib/utils";
import { ownerListQuerySchema } from "@/lib/validations/owner";

export const metadata: Metadata = { title: "Właściciele" };

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/wlasciciele");
  const params = await searchParams;

  const parsed = ownerListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : ownerListQuerySchema.parse({});

  const owners = await listOwners(session.user.organizationId, query);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">Właściciele</h1>
          <p className="text-sm text-muted">
            Właściciele lokali, które obsługujesz w podnajmie albo w zarządzaniu.
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/panel/wlasciciele/nowy">
            <Plus className="h-4 w-4" aria-hidden />
            Dodaj właściciela
          </Link>
        </Button>
      </div>

      {owners.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nie masz jeszcze żadnego właściciela"
          description="Dodaj właściciela, gdy wynajmujesz dalej cudze mieszkanie albo zarządzasz nim w jego imieniu. Przy własnych nieruchomościach ta lista zostaje pusta."
          action={
            <Button asChild>
              <Link href="/panel/wlasciciele/nowy">
                <Plus className="h-4 w-4" aria-hidden />
                Dodaj pierwszego właściciela
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {owners.map((owner) => (
            <Card key={owner.id} className="transition-colors hover:border-muted">
              <Link href={`/panel/wlasciciele/${owner.id}`} className="block rounded-card">
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-fg">{owner.name}</p>
                      {owner.archivedAt ? <Badge tone="warning">Zarchiwizowany</Badge> : null}
                      {owner.taxId ? <Badge>firma</Badge> : null}
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      {owner.city ? <span>{owner.city}</span> : null}
                      {owner.email ? <span>{owner.email}</span> : null}
                      {owner.phone ? <span>{owner.phone}</span> : null}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-fg">
                      {owner.propertyCount}{" "}
                      {plural(owner.propertyCount, [
                        "nieruchomość",
                        "nieruchomości",
                        "nieruchomości",
                      ])}
                    </p>
                    {owner.propertyCount > 0 ? (
                      <p className="text-xs text-muted">{owner.occupiedCount} wynajętych</p>
                    ) : null}
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

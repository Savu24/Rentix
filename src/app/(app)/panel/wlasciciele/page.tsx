import { Archive, KeyRound, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, pluralize } from "@/lib/i18n/format";
import { listOwners } from "@/lib/owners/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { ownerListQuerySchema } from "@/lib/validations/owner";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.title };
}

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/wlasciciele");
  const params = await searchParams;

  const parsed = ownerListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : ownerListQuerySchema.parse({});

  const [owners, dictionary, locale] = await Promise.all([
    listOwners(session.user.organizationId, query),
    panelDictionary(),
    panelLocale(),
  ]);
  const t = dictionary.panel.ownersPage;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">{t.lead}</p>
        </div>

        {/* Archiwum obok dodawania, bo to para: jedno chowa, drugie
            przywraca. Schowane w menu byłoby nie do znalezienia. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/wlasciciele/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              {t.archived}
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/wlasciciele/nowy">
              <Plus className="h-4 w-4" aria-hidden />
              {t.add}
            </Link>
          </Button>
        </div>
      </div>

      {owners.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={t.emptyTitle}
          description={t.emptyLead}
          action={
            <Button asChild>
              <Link href="/panel/wlasciciele/nowy">
                <Plus className="h-4 w-4" aria-hidden />
                {t.addFirst}
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
                      {owner.archivedAt ? <Badge tone="warning">{t.archivedBadge}</Badge> : null}
                      {owner.taxId ? <Badge>{t.companyBadge}</Badge> : null}
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      {owner.city ? <span>{owner.city}</span> : null}
                      {owner.email ? <span>{owner.email}</span> : null}
                      {owner.phone ? <span>{owner.phone}</span> : null}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-fg">
                      {fill(pluralize(locale, owner.propertyCount, t.propertyCount), {
                        count: owner.propertyCount,
                      })}
                    </p>
                    {owner.propertyCount > 0 ? (
                      <p className="text-xs text-muted">
                        {fill(t.occupiedCount, { count: owner.occupiedCount })}
                      </p>
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

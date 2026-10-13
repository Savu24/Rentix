import { Archive, Building2, Plus, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/panel/page-header";
import { PropertyCard, PropertyTableHead } from "@/components/panel/properties/property-card";
import { PropertyFilters } from "@/components/panel/properties/property-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { panelDictionary } from "@/lib/panel/dictionary";
import { listProperties } from "@/lib/properties/service";
import { propertyListQuerySchema } from "@/lib/validations/property";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.propertiesPage.title };
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/nieruchomosci");
  const params = await searchParams;
  const t = (await panelDictionary()).panel.propertiesPage;

  // Nieprawidłowe parametry z URL-a nie mają wywracać strony — wtedy po prostu
  // pokazujemy listę bez filtrów.
  const parsed = propertyListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : propertyListQuerySchema.parse({});

  const properties = await listProperties(session.user.organizationId, query);
  const hasFilters = Boolean(query.q) || Boolean(query.type) || query.occupancy !== "all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={t.title}
        primary={{ href: "/panel/nieruchomosci/nowa", label: t.add, icon: Plus }}
        /* Archiwum obok dodawania, bo to para: jedno chowa, drugie
           przywraca. Schowane w menu byłoby nie do znalezienia. */
        actions={
          <Button asChild variant="ghost">
            <Link href="/panel/nieruchomosci/archiwum">
              <Archive className="size-[18px]" aria-hidden />
              {t.archived}
            </Link>
          </Button>
        }
      />

      {!hasFilters && properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t.emptyTitle}
          action={
            <Button asChild>
              <Link href="/panel/nieruchomosci/nowa">
                <Plus className="size-[18px]" aria-hidden />
                {t.add}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <Suspense fallback={null}>
            <PropertyFilters total={properties.length} />
          </Suspense>

          {properties.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t.noMatchTitle}
              action={
                <Button asChild variant="secondary">
                  <Link href="/panel/nieruchomosci">
                    <X className="size-[18px]" aria-hidden />
                    {t.filters.clear}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface">
              <PropertyTableHead />
              <ul className="flex flex-col gap-3 lg:gap-0">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { Archive, Building2, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PropertyCard } from "@/components/panel/properties/property-card";
import { PropertyFilters } from "@/components/panel/properties/property-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { listProperties } from "@/lib/properties/service";
import { propertyListQuerySchema } from "@/lib/validations/property";

export const metadata: Metadata = { title: "Nieruchomości" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/nieruchomosci");
  const params = await searchParams;

  // Nieprawidłowe parametry z URL-a nie mają wywracać strony — wtedy po prostu
  // pokazujemy listę bez filtrów.
  const parsed = propertyListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : propertyListQuerySchema.parse({});

  const properties = await listProperties(session.user.organizationId, query);
  const hasFilters = Boolean(query.q) || Boolean(query.type) || query.occupancy !== "all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">Nieruchomości</h1>
          <p className="text-sm text-muted">Obiekty i jednostki najmu w Twoim portfelu.</p>
        </div>

        {/* Archiwum obok dodawania, bo to para: jedno chowa, drugie
            przywraca. Schowane w menu byłoby nie do znalezienia. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" variant="secondary">
            <Link href="/panel/nieruchomosci/archiwum">
              <Archive className="h-4 w-4" aria-hidden />
              Zarchiwizowane
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/panel/nieruchomosci/nowa">
              <Plus className="h-4 w-4" aria-hidden />
              Dodaj nieruchomość
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={null}>
        <PropertyFilters total={properties.length} />
      </Suspense>

      {properties.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Nic nie pasuje do filtrów"
            description="Spróbuj innej frazy albo wyczyść filtry, żeby zobaczyć wszystkie nieruchomości."
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Nie masz jeszcze żadnej nieruchomości"
            description="Dodaj pierwszy obiekt, a potem jednostki najmu. Umowy, faktury i zgłoszenia podepną się pod nie."
            action={
              <Button asChild>
                <Link href="/panel/nieruchomosci/nowa">
                  <Plus className="h-4 w-4" aria-hidden />
                  Dodaj nieruchomość
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

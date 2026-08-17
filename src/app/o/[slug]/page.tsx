import { Building2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPLN } from "@/lib/money";
import { getPublicListing } from "@/lib/properties/public";
import { plural } from "@/lib/utils";
import { PROPERTY_TYPE_LABEL } from "@/lib/validations/property";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) return { title: "Nie znaleziono ofert" };

  return {
    title: `Oferty najmu — ${listing.organization.name}`,
    description: `Aktualne oferty najmu od ${listing.organization.name}.`,
  };
}

/**
 * Publiczna strona ofert: /o/<slug>.
 *
 * Cel przełącznika „Pokazuj publicznie" przy nieruchomości — do tej pory
 * przełącznik istniał w panelu, ale nie miał gdzie prowadzić.
 *
 * Strona jest jawna, bez sesji, więc pokazuje wyłącznie to, co właściciel
 * świadomie odsłonił: nazwę, adres, metraż i cenę wywoławczą. Notatki
 * właściciela, dane najemców i rozliczenia nigdy tu nie trafiają — dlatego
 * zapytanie ma własny, wąski `select`, a nie współdzieli go z panelem.
 */
export default async function PublicListingPage({ params }: Params) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) notFound();

  const { organization, properties } = listing;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted">{organization.name}</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[28px] leading-tight text-fg">Oferty najmu</h1>
          <p className="text-sm text-muted">
            {organization.name}
            {organization.city ? ` · ${organization.city}` : ""}
          </p>
        </div>

        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Brak aktualnych ofert"
            description="W tej chwili nie ma nic do wynajęcia. Zajrzyj później."
          />
        ) : (
          <>
            <p className="text-sm text-muted">
              {properties.length} {plural(properties.length, ["oferta", "oferty", "ofert"])}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-fg">{property.name}</h2>
                      <Badge>{PROPERTY_TYPE_LABEL[property.type]}</Badge>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {/* Bez numeru budynku: adres z dokładnością do ulicy
                          wystarcza w ogłoszeniu, a resztę podaje się przy
                          umówieniu wizyty. */}
                      {property.street}, {property.city}
                    </p>

                    <p className="text-xs text-muted">
                      {property.areaM2 ? `${property.areaM2} m²` : null}
                      {property.areaM2 && property.floor !== null ? " · " : null}
                      {property.floor !== null ? `piętro ${property.floor}` : null}
                      {property.availableRooms > 0
                        ? `${property.areaM2 || property.floor !== null ? " · " : ""}${
                            property.availableRooms
                          } ${plural(property.availableRooms, [
                            "wolny pokój",
                            "wolne pokoje",
                            "wolnych pokoi",
                          ])}`
                        : null}
                    </p>

                    {property.description ? (
                      <p className="text-sm leading-relaxed text-fg/80">{property.description}</p>
                    ) : null}

                    {property.askingRentGrosze ? (
                      <p className="mt-1 font-mono text-[17px] font-semibold text-accent">
                        {formatPLN(property.askingRentGrosze)}
                        <span className="text-xs font-normal text-muted"> / mies.</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Cena do uzgodnienia</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs text-muted">
          Strona prowadzona w systemie Rentix. Ceny mają charakter informacyjny i nie stanowią
          oferty w rozumieniu Kodeksu cywilnego.
        </p>
      </main>
    </div>
  );
}

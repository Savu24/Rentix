import { Building2, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPropertyAddress } from "@/lib/properties/address";
import type { PropertyListItem } from "@/lib/properties/service";
import { fill, pluralize } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { propertyTypeLabels } from "@/lib/validations/property";

/**
 * Status obłożenia całej nieruchomości, wyprowadzony z jej jednostek.
 * Nie trzymamy go w bazie — zmienia się przy każdej umowie i byłby ciągle
 * nieaktualny.
 */
function occupancyBadge(property: PropertyListItem, t: Dictionary["panel"]["propertiesPage"]) {
  const badge = t.badge;

  // Remont przykrywa rachunek pokoi: lokal wyłączony z najmu nie jest „wolny",
  // choćby wszystkie pokoje stały puste.
  if (property.status === "UNAVAILABLE") {
    return { tone: "neutral" as const, label: badge.underRefurbishment };
  }

  // Bez pokoi wynajmuje się całość — wtedy liczy się status nieruchomości.
  if (property.roomCount === 0) {
    return property.status === "OCCUPIED"
      ? { tone: "good" as const, label: badge.let }
      : { tone: "warning" as const, label: badge.vacant };
  }
  if (property.availableRoomCount === 0) {
    // Krótko, bo etykieta stoi w wąskiej kolumnie na telefonie — „Wszystkie
    // pokoje zajęte" nie mieściło się i rozpychało kartę poza ekran.
    return { tone: "good" as const, label: badge.allLet };
  }
  if (property.occupiedRoomCount === 0) {
    return { tone: "warning" as const, label: badge.vacant };
  }
  return {
    tone: "warning" as const,
    label: fill(badge.someVacant, {
      available: property.availableRoomCount,
      total: property.roomCount,
    }),
  };
}

export async function PropertyCard({ property }: { property: PropertyListItem }) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.propertiesPage;

  const badge = occupancyBadge(property, t);
  const address = formatPropertyAddress(property);

  return (
    <Card className="transition-colors hover:border-muted">
      <Link
        href={`/panel/nieruchomosci/${property.id}`}
        className="flex h-full flex-col gap-3 rounded-card p-4"
      >
        {/*
          Nagłówek zawija się, gdy zabraknie miejsca.

          Znacznik statusu ma `whitespace-nowrap`, więc nie da się go zwęzić —
          bez `flex-wrap` i minimalnej szerokości bloku z nazwą wypychał treść
          poza kartę, a wraz z nią całą stronę w poziomie. Teraz przy wąskim
          ekranie spada do drugiej linii zamiast rozpychać układ.
        */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-alt">
            <Building2 className="h-5 w-5 text-muted" aria-hidden />
          </span>

          <div className="min-w-[9rem] flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">{property.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{address}</span>
            </p>
          </div>

          <Badge tone={badge.tone} className="shrink-0">
            {badge.label}
          </Badge>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>{propertyTypeLabels(d)[property.type]}</span>
          {property.roomCount > 0 ? (
            <span>
              {property.roomCount} {pluralize(locale, property.roomCount, t.rooms)}
            </span>
          ) : null}
          {property.areaM2 ? (
            <span className="tabular">{locale === "pl" ? property.areaM2.replace(".", ",") : property.areaM2} m²</span>
          ) : null}
          {/* Kod do domofonu na liście, bo po niego się tu wraca — zwykle
              stojąc przed budynkiem z telefonem w ręku. */}
          {property.intercomCode ? (
            <span className="tabular">domofon {property.intercomCode}</span>
          ) : null}
          {property.archivedAt ? (
            <span className="font-medium text-warn">Zarchiwizowana</span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

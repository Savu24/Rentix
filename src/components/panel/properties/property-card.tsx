import { Building2, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PropertyListItem } from "@/lib/properties/service";
import { formatPLN } from "@/lib/money";
import { plural } from "@/lib/utils";
import { PROPERTY_TYPE_LABEL } from "@/lib/validations/property";

/**
 * Status obłożenia całej nieruchomości, wyprowadzony z jej jednostek.
 * Nie trzymamy go w bazie — zmienia się przy każdej umowie i byłby ciągle
 * nieaktualny.
 */
function occupancyBadge(property: PropertyListItem) {
  // Bez pokoi wynajmuje się całość — wtedy liczy się status nieruchomości.
  if (property.roomCount === 0) {
    return property.status === "OCCUPIED"
      ? { tone: "good" as const, label: "Wynajęta" }
      : { tone: "warning" as const, label: "Wolna" };
  }
  if (property.availableRoomCount === 0) {
    return { tone: "good" as const, label: "Wszystkie pokoje zajęte" };
  }
  if (property.occupiedRoomCount === 0) {
    return { tone: "warning" as const, label: "Wolna" };
  }
  return {
    tone: "warning" as const,
    label: `${property.availableRoomCount} z ${property.roomCount} wolnych`,
  };
}

export function PropertyCard({ property }: { property: PropertyListItem }) {
  const badge = occupancyBadge(property);
  const address = [
    `${property.street} ${property.buildingNumber}`,
    property.postalCode,
    property.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="transition-colors hover:border-muted">
      <Link
        href={`/panel/nieruchomosci/${property.id}`}
        className="flex h-full flex-col gap-3 rounded-card p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-alt">
            <Building2 className="h-5 w-5 text-muted" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-fg">{property.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{address}</span>
            </p>
          </div>

          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>{PROPERTY_TYPE_LABEL[property.type]}</span>
          {property.roomCount > 0 ? (
            <span>
              {property.roomCount} {plural(property.roomCount, ["pokój", "pokoje", "pokoi"])}
            </span>
          ) : null}
          {property.areaM2 ? (
            <span className="tabular">{property.areaM2.replace(".", ",")} m²</span>
          ) : null}
          {property.vacantRoomRentGrosze > 0 ? (
            <span className="tabular">
              wolne za {formatPLN(property.vacantRoomRentGrosze)}
            </span>
          ) : property.askingRentGrosze ? (
            <span className="tabular">{formatPLN(property.askingRentGrosze)}</span>
          ) : null}
          {property.archivedAt ? (
            <span className="font-medium text-warn">Zarchiwizowana</span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

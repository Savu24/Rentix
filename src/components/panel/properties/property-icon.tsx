import {
  Archive,
  Building,
  Building2,
  BedDouble,
  Car,
  Home,
  Store,
  type LucideIcon,
} from "lucide-react";

import type { PropertyType } from "@/generated/prisma/enums";

/** Ikona typu nieruchomości — ta sama na liście, karcie i pulpicie. */
export const PROPERTY_TYPE_ICON: Record<PropertyType, LucideIcon> = {
  APARTMENT: Building2,
  HOUSE: Home,
  ROOM: BedDouble,
  COMMERCIAL: Store,
  PARKING: Car,
  STORAGE: Archive,
  BUILDING: Building,
};

/** Kafelek z ikoną typu (40 px na liście, 32 px w wierszach pulpitu). */
export function PropertyIcon({ type, small = false }: { type: PropertyType; small?: boolean }) {
  const Icon = PROPERTY_TYPE_ICON[type];

  return (
    <span
      className={
        small
          ? "flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-alt"
          : "flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-alt"
      }
    >
      <Icon className="size-[18px] text-muted" aria-hidden />
    </span>
  );
}

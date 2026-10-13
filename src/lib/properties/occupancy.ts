import type { RentalStatus } from "@/generated/prisma/enums";

/**
 * Status obłożenia całej nieruchomości, wyprowadzony z jej jednostek.
 *
 * Nie trzymamy go w bazie — zmienia się przy każdej umowie i byłby ciągle
 * nieaktualny. Jedna funkcja dla listy nieruchomości i pulpitu, żeby ten sam
 * lokal nie był „wolny" na jednym ekranie i „częściowo zajęty" na drugim.
 */
export type PropertyOccupancy =
  | { kind: "refurbishment" }
  | { kind: "let" }
  | { kind: "vacant" }
  | { kind: "allLet" }
  | { kind: "someVacant"; available: number; total: number };

export type OccupancyInput = {
  status: RentalStatus;
  roomCount: number;
  occupiedRoomCount: number;
  availableRoomCount: number;
};

export function resolvePropertyOccupancy(property: OccupancyInput): PropertyOccupancy {
  // Remont przykrywa rachunek pokoi: lokal wyłączony z najmu nie jest „wolny",
  // choćby wszystkie pokoje stały puste.
  if (property.status === "UNAVAILABLE") return { kind: "refurbishment" };

  // Bez pokoi wynajmuje się całość — wtedy liczy się status nieruchomości.
  if (property.roomCount === 0) {
    return { kind: property.status === "OCCUPIED" ? "let" : "vacant" };
  }
  if (property.availableRoomCount === 0) return { kind: "allLet" };
  if (property.occupiedRoomCount === 0) return { kind: "vacant" };

  return {
    kind: "someVacant",
    available: property.availableRoomCount,
    total: property.roomCount,
  };
}

export type OccupancyFilter = "all" | "vacant" | "occupied" | "unavailable";

/**
 * Czy lokal pasuje do filtra listy. Liczone z tego samego obłożenia co
 * plakietka, żeby filtr „Wolne" nie pokazywał lokalu oznaczonego „Wszystkie
 * zajęte". Lokal z częścią wolnych pokoi jest „Wolny" — da się go jeszcze
 * wynająć.
 */
export function matchesOccupancyFilter(occupancy: PropertyOccupancy, filter: OccupancyFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "vacant":
      return occupancy.kind === "vacant" || occupancy.kind === "someVacant";
    case "occupied":
      return occupancy.kind === "let" || occupancy.kind === "allLet";
    case "unavailable":
      return occupancy.kind === "refurbishment";
  }
}

/** Obłożenie w procentach, zaokrąglone; 0 przy braku pokoi zamiast dzielenia przez zero. */
export function occupancyPercent(occupied: number, total: number): number {
  return total > 0 ? Math.round((occupied / total) * 100) : 0;
}

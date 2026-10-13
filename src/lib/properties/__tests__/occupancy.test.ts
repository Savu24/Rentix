import { describe, expect, it } from "vitest";

import {
  matchesOccupancyFilter,
  resolvePropertyOccupancy,
  type OccupancyInput,
} from "@/lib/properties/occupancy";

const property = (input: Partial<OccupancyInput>): OccupancyInput => ({
  status: "AVAILABLE",
  roomCount: 0,
  occupiedRoomCount: 0,
  availableRoomCount: 0,
  ...input,
});

const matches = (input: Partial<OccupancyInput>, filter: Parameters<typeof matchesOccupancyFilter>[1]) =>
  matchesOccupancyFilter(resolvePropertyOccupancy(property(input)), filter);

describe("matchesOccupancyFilter", () => {
  it("lokal na pokoje z kompletem najemców nie jest „Wolny”, choć jego status mówi AVAILABLE", () => {
    const full = { status: "AVAILABLE" as const, roomCount: 4, occupiedRoomCount: 4 };
    expect(matches(full, "vacant")).toBe(false);
    expect(matches(full, "occupied")).toBe(true);
  });

  it("lokal z częścią wolnych pokoi jest „Wolny”, a nie „Wynajęty”", () => {
    const partial = { status: "OCCUPIED" as const, roomCount: 4, occupiedRoomCount: 3, availableRoomCount: 1 };
    expect(matches(partial, "vacant")).toBe(true);
    expect(matches(partial, "occupied")).toBe(false);
  });

  it("lokal bez pokoi idzie za statusem nieruchomości", () => {
    expect(matches({ status: "AVAILABLE" }, "vacant")).toBe(true);
    expect(matches({ status: "OCCUPIED" }, "occupied")).toBe(true);
    expect(matches({ status: "OCCUPIED" }, "vacant")).toBe(false);
  });

  it("remont trafia tylko do „Remont”, nawet z pustymi pokojami", () => {
    const refurb = { status: "UNAVAILABLE" as const, roomCount: 3, availableRoomCount: 3 };
    expect(matches(refurb, "unavailable")).toBe(true);
    expect(matches(refurb, "vacant")).toBe(false);
  });

  it("„Wszystkie” przepuszcza każdy lokal", () => {
    expect(matches({ status: "UNAVAILABLE" }, "all")).toBe(true);
  });
});

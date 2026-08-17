import { describe, expect, it } from "vitest";

import { plural } from "@/lib/utils";

const ROOMS: [string, string, string] = ["pokój", "pokoje", "pokoi"];

describe("plural", () => {
  it("liczba pojedyncza", () => {
    expect(plural(1, ROOMS)).toBe("pokój");
  });

  it("2–4 biorą formę mnogą lekką", () => {
    // To był realny błąd: „4 pokoi" zamiast „4 pokoje".
    expect(plural(2, ROOMS)).toBe("pokoje");
    expect(plural(3, ROOMS)).toBe("pokoje");
    expect(plural(4, ROOMS)).toBe("pokoje");
  });

  it("5 i więcej bierze dopełniacz", () => {
    expect(plural(5, ROOMS)).toBe("pokoi");
    expect(plural(9, ROOMS)).toBe("pokoi");
  });

  it("nastki są wyjątkiem mimo końcówki 2–4", () => {
    expect(plural(12, ROOMS)).toBe("pokoi");
    expect(plural(13, ROOMS)).toBe("pokoi");
    expect(plural(14, ROOMS)).toBe("pokoi");
  });

  it("dziesiątki wracają do reguły od ostatniej cyfry", () => {
    expect(plural(22, ROOMS)).toBe("pokoje");
    expect(plural(24, ROOMS)).toBe("pokoje");
    expect(plural(25, ROOMS)).toBe("pokoi");
    expect(plural(112, ROOMS)).toBe("pokoi");
    expect(plural(122, ROOMS)).toBe("pokoje");
  });

  it("zero bierze dopełniacz", () => {
    expect(plural(0, ROOMS)).toBe("pokoi");
  });

  it("działa dla innych rzeczowników", () => {
    const units: [string, string, string] = ["jednostka", "jednostki", "jednostek"];
    expect(plural(1, units)).toBe("jednostka");
    expect(plural(3, units)).toBe("jednostki");
    expect(plural(7, units)).toBe("jednostek");
  });
});

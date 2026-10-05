import { describe, expect, it } from "vitest";

import {
  normalizeStreet,
  tenantAddressMatches,
  tenantPropertyIds,
  type MatchableProperty,
} from "@/lib/tenants/address-match";

const flat: MatchableProperty = {
  id: "flat",
  street: "Długa",
  buildingNumber: "14",
  apartmentNumber: "3",
  postalCode: "30-001",
  city: "Kraków",
};

const house: MatchableProperty = {
  id: "house",
  street: "Marszałkowska",
  buildingNumber: "7",
  apartmentNumber: null,
  postalCode: "00-001",
  city: "Warszawa",
};

const tenant = (street: string | null, city: string | null = null) => ({
  street,
  city,
  leasePropertyIds: [] as string[],
});

describe("normalizeStreet", () => {
  it("sprowadza różne zapisy tego samego adresu do jednej postaci", () => {
    expect(normalizeStreet("ul. Długa 14 m. 3")).toBe("dluga 14/3");
    expect(normalizeStreet("Długa 14 / 3")).toBe("dluga 14/3");
    expect(normalizeStreet("DLUGA 14 lok. 3,")).toBe("dluga 14/3");
  });

  it("nie rusza nazw ulic zaczynających się od „m”", () => {
    expect(normalizeStreet("ul. Marszałkowska 7")).toBe("marszalkowska 7");
  });
});

describe("tenantAddressMatches", () => {
  it("łapie ten sam lokal zapisany na różne sposoby", () => {
    expect(tenantAddressMatches(tenant("Długa 14/3"), flat)).toBe(true);
    expect(tenantAddressMatches(tenant("ul. Dluga 14 m. 3", "Kraków"), flat)).toBe(true);
  });

  it("nie łapie sąsiedniego lokalu ani budynku", () => {
    expect(tenantAddressMatches(tenant("Długa 14/31"), flat)).toBe(false);
    expect(tenantAddressMatches(tenant("Długa 14/4"), flat)).toBe(false);
    expect(tenantAddressMatches(tenant("Długa 145/3"), flat)).toBe(false);
    expect(tenantAddressMatches(tenant("Długa 14"), flat)).toBe(false);
  });

  it("przy całym budynku łapie każdy lokal pod tym numerem", () => {
    expect(tenantAddressMatches(tenant("Marszałkowska 7"), house)).toBe(true);
    expect(tenantAddressMatches(tenant("Marszałkowska 7/2"), house)).toBe(true);
    expect(tenantAddressMatches(tenant("Marszałkowska 7a"), house)).toBe(false);
  });

  it("ta sama ulica w innym mieście to inny adres", () => {
    expect(tenantAddressMatches(tenant("Długa 14/3", "Gdańsk"), flat)).toBe(false);
  });

  it("bez adresu w karcie nikt nie pasuje", () => {
    expect(tenantAddressMatches(tenant(null), flat)).toBe(false);
    expect(tenantAddressMatches(tenant("  "), flat)).toBe(false);
  });
});

describe("tenantPropertyIds", () => {
  it("bierze nieruchomości z adresu i z wcześniejszych umów", () => {
    const result = tenantPropertyIds(
      { street: "Długa 14/3", city: "Kraków", leasePropertyIds: ["house"] },
      [flat, house],
    );
    expect(result).toEqual(["flat", "house"]);
  });

  it("najemca spod innego adresu i bez umów nie trafia nigdzie", () => {
    expect(tenantPropertyIds(tenant("Krótka 1"), [flat, house])).toEqual([]);
  });
});

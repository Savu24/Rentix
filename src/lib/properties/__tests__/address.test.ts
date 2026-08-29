import { describe, expect, it } from "vitest";

import {
  formatPropertyAddress,
  formatStreetLine,
  formatUnitLabel,
  roomDesignation,
} from "@/lib/properties/address";

const FLAT = {
  street: "Kwiatowa",
  buildingNumber: "4",
  apartmentNumber: "2",
  postalCode: "30-001",
  city: "Kraków",
};

const HOUSE = { ...FLAT, apartmentNumber: null };

describe("formatStreetLine", () => {
  it("skleja numer budynku i lokalu ukośnikiem", () => {
    expect(formatStreetLine(FLAT)).toBe("Kwiatowa 4/2");
  });

  it("bez numeru lokalu zostaje sam numer budynku", () => {
    expect(formatStreetLine(HOUSE)).toBe("Kwiatowa 4");
  });

  it("pusty numer lokalu traktuje jak brak", () => {
    // Formularz wysyła "" gdy pole zostało puste; walidacja zamienia to na
    // null, ale rekordy z importu potrafią przyjść z samą spacją.
    expect(formatStreetLine({ ...FLAT, apartmentNumber: "" })).toBe("Kwiatowa 4");
    expect(formatStreetLine({ ...FLAT, apartmentNumber: "   " })).toBe("Kwiatowa 4");
  });

  it("nie gubi numeru lokalu zapisanego literą", () => {
    expect(formatStreetLine({ ...FLAT, apartmentNumber: "3A" })).toBe("Kwiatowa 4/3A");
  });
});

describe("formatPropertyAddress", () => {
  it("dokłada kod pocztowy i miasto", () => {
    expect(formatPropertyAddress(FLAT)).toBe("Kwiatowa 4/2, 30-001 Kraków");
  });

  it("nie zostawia wiszącego przecinka przy braku miejscowości", () => {
    expect(formatPropertyAddress({ ...FLAT, postalCode: null, city: null })).toBe("Kwiatowa 4/2");
  });

  it("radzi sobie z samym miastem, bez kodu", () => {
    expect(formatPropertyAddress({ ...FLAT, postalCode: null })).toBe("Kwiatowa 4/2, Kraków");
  });
});

describe("formatUnitLabel", () => {
  it("mieszkanie opisuje numerem lokalu", () => {
    expect(formatUnitLabel(FLAT)).toBe("lokal nr 2");
  });

  it("bez numeru lokalu mówi o budynku, a nie o lokalu", () => {
    // „Lokal nr 4" przy domu pod numerem 4 czytałoby się jak mieszkanie
    // o tym numerze, którego w tym budynku nie ma.
    expect(formatUnitLabel(HOUSE)).toBe("budynek nr 4");
  });
});

describe("roomDesignation", () => {
  it("obcina rzeczownik z nazwy zakładanej przez kreator", () => {
    // Dokumenty doklejają własne „pokój" — bez tego na fakturze stało
    // „Dotyczy: Kwiatowa 4, pokój Pokój 1, …".
    expect(roomDesignation("Pokój 1")).toBe("1");
    expect(roomDesignation("pokoj 2")).toBe("2");
    expect(roomDesignation("POKÓJ A")).toBe("A");
  });

  it("nazwę własną zostawia w całości", () => {
    expect(roomDesignation("Od podwórza")).toBe("Od podwórza");
    expect(roomDesignation(" 3 ")).toBe("3");
  });

  it("nie obcina słowa, które tylko zaczyna się tak samo", () => {
    expect(roomDesignation("Pokójek")).toBe("Pokójek");
  });

  it("pokój nazwany samym rzeczownikiem zostaje bez zmian", () => {
    // Po obcięciu nie zostałoby nic, a „pokój " z pustym ogonem czyta się
    // gorzej niż powtórzenie.
    expect(roomDesignation("Pokój")).toBe("Pokój");
  });
});

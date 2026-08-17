import { describe, expect, it } from "vitest";

import { formatPLN, initials, slugify } from "@/lib/utils";

/** Intl wstawia spacje nierozdzielające — do porównań zamieniamy je na zwykłe. */
const normalizeSpaces = (value: string) => value.replace(/[\s  ]/g, " ");

describe("formatPLN", () => {
  it("używa przecinka jako separatora dziesiętnego", () => {
    expect(normalizeSpaces(formatPLN(240_000))).toBe("2 400,00 zł");
  });

  it("grupuje tysiące spacją, a nie przecinkiem", () => {
    expect(normalizeSpaces(formatPLN(1_840_000))).toBe("18 400,00 zł");
  });

  it("zawsze pokazuje dwa miejsca po przecinku", () => {
    expect(normalizeSpaces(formatPLN(100))).toBe("1,00 zł");
    expect(normalizeSpaces(formatPLN(1))).toBe("0,01 zł");
  });

  it("obsługuje zero i kwoty ujemne (korekty, nadpłaty)", () => {
    expect(normalizeSpaces(formatPLN(0))).toBe("0,00 zł");
    expect(normalizeSpaces(formatPLN(-25_000))).toContain("250,00 zł");
  });

  it("nie gubi groszy przy kwotach, które w liczbach zmiennoprzecinkowych by uciekły", () => {
    // 0.1 + 0.2 !== 0.3 w float; trzymanie groszy jako liczb całkowitych to omija.
    expect(normalizeSpaces(formatPLN(10 + 20))).toBe("0,30 zł");
  });
});

describe("slugify", () => {
  it("usuwa polskie znaki diakrytyczne", () => {
    expect(slugify("Kowalski Nieruchomości")).toBe("kowalski-nieruchomosci");
    expect(slugify("Zażółć gęślą jaźń")).toBe("zazolc-gesla-jazn");
  });

  it("obsługuje Ł, które nie ma dekompozycji NFD", () => {
    expect(slugify("Łódź Wynajem")).toBe("lodz-wynajem");
    expect(slugify("Biały Dom")).toBe("bialy-dom");
  });

  it("nie zostawia myślników na brzegach ani zdublowanych w środku", () => {
    expect(slugify("  Nieruchomości   Premium!!!  ")).toBe("nieruchomosci-premium");
  });

  it("zwraca pusty ciąg dla nazwy bez znaków alfanumerycznych", () => {
    // Wołający podstawia wtedy wartość zastępczą — patrz uniqueOrganizationSlug().
    expect(slugify("!!!")).toBe("");
  });

  it("przycina bardzo długie nazwy", () => {
    expect(slugify("a".repeat(100)).length).toBe(48);
  });
});

describe("initials", () => {
  it("bierze pierwsze litery dwóch pierwszych członów", () => {
    expect(initials("Aleksandra Kowal")).toBe("AK");
    expect(initials("Jan Maria Rokita")).toBe("JM");
  });

  it("radzi sobie z jednym członem i brakiem nazwy", () => {
    expect(initials("Marta")).toBe("M");
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});

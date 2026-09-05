import { describe, expect, it } from "vitest";

import {
  multiplyByQuantity,
  formatMoney,
  formatPLN,
  parseMoney,
  parsePLN,
  roundHalf,
  splitGrosze,
  sumGrosze,
  toQuantityMilli,
} from "@/lib/money";

describe("parsePLN", () => {
  it("czyta polski zapis z przecinkiem i spacją tysięcy", () => {
    expect(parsePLN("2 400,50")).toBe(240050);
    expect(parsePLN("18 400,00")).toBe(1840000);
  });

  it("czyta spację nierozdzielającą wklejoną z arkusza", () => {
    expect(parsePLN("2 400,50")).toBe(240050);
  });

  it("czyta zapis z kropką", () => {
    expect(parsePLN("2400.50")).toBe(240050);
  });

  it("dopełnia pojedyncze miejsce po przecinku", () => {
    expect(parsePLN("2400,5")).toBe(240050);
  });

  it("przyjmuje kwotę z symbolem waluty", () => {
    expect(parsePLN("2400,50 zł")).toBe(240050);
    expect(parsePLN("2400,50 PLN")).toBe(240050);
  });

  it("obsługuje kwoty ujemne (korekty)", () => {
    expect(parsePLN("-250,00")).toBe(-25000);
  });

  it("czyta zero i same grosze", () => {
    expect(parsePLN("0")).toBe(0);
    expect(parsePLN("0,01")).toBe(1);
  });

  it("odrzuca wejście, które nie jest kwotą", () => {
    expect(parsePLN("")).toBeNull();
    expect(parsePLN("abc")).toBeNull();
    expect(parsePLN("zł")).toBeNull();
    expect(parsePLN("1,2,3")).toBeNull();
  });

  it("odrzuca więcej niż dwa miejsca po przecinku", () => {
    // 2400,555 zł nie istnieje — to pomyłka, nie kwota do zaokrąglenia.
    expect(parsePLN("2400,555")).toBeNull();
  });
});

describe("roundHalf", () => {
  it("zaokrągla połówki w górę dla liczb dodatnich", () => {
    expect(roundHalf(0.5)).toBe(1);
    expect(roundHalf(1.5)).toBe(2);
    expect(roundHalf(2.4)).toBe(2);
  });

  it("zaokrągla połówki od zera dla liczb ujemnych", () => {
    // Math.round(-0.5) daje -0 — dla korekt to grosz w złą stronę.
    expect(roundHalf(-0.5)).toBe(-1);
    expect(roundHalf(-1.5)).toBe(-2);
  });
});

describe("multiplyByQuantity", () => {
  it("mnoży cenę przez pełne sztuki", () => {
    expect(multiplyByQuantity(240000, 1000)).toBe(240000);
    expect(multiplyByQuantity(240000, 3000)).toBe(720000);
  });

  it("mnoży przez ilość ułamkową i zaokrągla raz, na końcu", () => {
    // 4,235 m³ × 9,87 zł/m³ = 41,79945 zł → 41,80 zł
    expect(multiplyByQuantity(987, 4235)).toBe(4180);
  });

  it("nie gubi grosza na ilościach, które we Floacie by uciekły", () => {
    // 0,1 × 3 = 0,30000000000000004 w IEEE 754
    expect(multiplyByQuantity(10000, 300)).toBe(3000);
  });
});

describe("toQuantityMilli", () => {
  it("zamienia liczbę i tekst na tysięczne", () => {
    expect(toQuantityMilli(4.235)).toBe(4235);
    expect(toQuantityMilli("4,235")).toBe(4235);
    expect(toQuantityMilli(1)).toBe(1000);
  });

  it("odrzuca wejście, które nie jest liczbą", () => {
    expect(() => toQuantityMilli("abc")).toThrow();
  });
});

describe("sumGrosze", () => {
  it("sumuje bez utraty groszy", () => {
    // Klasyczny przykład: 0,1 + 0,2 !== 0,3 we Floacie.
    expect(sumGrosze([10, 20])).toBe(30);
    expect(sumGrosze([240000, 31000, 18500])).toBe(289500);
    expect(sumGrosze([])).toBe(0);
  });
});

describe("splitGrosze", () => {
  it("dzieli równo, gdy kwota się dzieli", () => {
    expect(splitGrosze(30000, 3)).toEqual([10000, 10000, 10000]);
  });

  it("rozdziela resztę po groszu, żeby suma się zgadzała", () => {
    const parts = splitGrosze(10000, 3);
    expect(parts).toEqual([3334, 3333, 3333]);
    expect(sumGrosze(parts)).toBe(10000);
  });

  it("zachowuje sumę także dla kwot ujemnych", () => {
    const parts = splitGrosze(-10000, 3);
    expect(sumGrosze(parts)).toBe(-10000);
  });

  it("odrzuca nieprawidłową liczbę części", () => {
    expect(() => splitGrosze(100, 0)).toThrow();
    expect(() => splitGrosze(100, -2)).toThrow();
    expect(() => splitGrosze(100, 1.5)).toThrow();
  });
});

describe("kwoty w wersji brytyjskiej", () => {
  it("formatuje funty z przecinkiem jako separatorem tysięcy", () => {
    expect(formatMoney(1_840_000, "uk")).toBe("£18,400.00");
    expect(formatMoney(240_000, "uk")).toBe("£2,400.00");
  });

  it("polska wersja zostaje bez zmian", () => {
    expect(formatMoney(1_840_000, "pl")).toBe(formatPLN(1_840_000));
  });

  /*
    Sedno sprawy: separatory są w obu krajach odwrotne. „1,234.56" to po
    brytyjsku tysiąc dwieście, a po polsku tego zapisu nie ma w ogóle —
    pomyłka tutaj to trzy rzędy wielkości na dokumencie.
  */
  it("czyta brytyjski zapis kwoty", () => {
    expect(parseMoney("1,234.56", "uk")).toBe(123456);
    expect(parseMoney("£2,400.50", "uk")).toBe(240050);
    expect(parseMoney("2400.5", "uk")).toBe(240050);
  });

  it("czyta polski zapis kwoty", () => {
    expect(parseMoney("2 400,50", "pl")).toBe(240050);
    expect(parseMoney("1.234,56", "pl")).toBe(123456);
    // Bez przecinka kropka jest przecinkiem dziesiętnym — tak wkleja arkusz.
    expect(parseMoney("2400.50", "pl")).toBe(240050);
  });

  it("nie przyjmuje kwoty z więcej niż dwoma miejscami po przecinku", () => {
    expect(parseMoney("12.345", "uk")).toBeNull();
    expect(parseMoney("12,345", "pl")).toBeNull();
  });
});

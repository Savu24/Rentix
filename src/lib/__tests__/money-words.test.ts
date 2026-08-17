import { describe, expect, it } from "vitest";

import { groszeToPolishWords, integerToPolishWords } from "@/lib/money-words";

describe("integerToPolishWords", () => {
  it("liczby jednocyfrowe i zero", () => {
    expect(integerToPolishWords(0)).toBe("zero");
    expect(integerToPolishWords(1)).toBe("jeden");
    expect(integerToPolishWords(9)).toBe("dziewięć");
  });

  it("nastki mają własne nazwy, a nie 'dziesięć jeden'", () => {
    expect(integerToPolishWords(11)).toBe("jedenaście");
    expect(integerToPolishWords(15)).toBe("piętnaście");
    expect(integerToPolishWords(19)).toBe("dziewiętnaście");
  });

  it("dziesiątki i setki", () => {
    expect(integerToPolishWords(20)).toBe("dwadzieścia");
    expect(integerToPolishWords(42)).toBe("czterdzieści dwa");
    expect(integerToPolishWords(100)).toBe("sto");
    expect(integerToPolishWords(256)).toBe("dwieście pięćdziesiąt sześć");
    expect(integerToPolishWords(900)).toBe("dziewięćset");
  });

  it("mówi 'tysiąc', a nie 'jeden tysiąc'", () => {
    expect(integerToPolishWords(1000)).toBe("tysiąc");
    expect(integerToPolishWords(1001)).toBe("tysiąc jeden");
  });

  it("odmienia tysiące według polskich reguł", () => {
    expect(integerToPolishWords(2000)).toBe("dwa tysiące");
    expect(integerToPolishWords(4000)).toBe("cztery tysiące");
    expect(integerToPolishWords(5000)).toBe("pięć tysięcy");
    expect(integerToPolishWords(24000)).toBe("dwadzieścia cztery tysiące");
  });

  it("nastki tysięcy biorą dopełniacz mimo końcówki 2–4", () => {
    // 12, 13, 14 to wyjątek od reguły „końcówka 2–4 → tysiące".
    expect(integerToPolishWords(12000)).toBe("dwanaście tysięcy");
    expect(integerToPolishWords(13000)).toBe("trzynaście tysięcy");
    expect(integerToPolishWords(112000)).toBe("sto dwanaście tysięcy");
  });

  it("miliony", () => {
    expect(integerToPolishWords(1_000_000)).toBe("milion");
    expect(integerToPolishWords(2_000_000)).toBe("dwa miliony");
    expect(integerToPolishWords(5_000_000)).toBe("pięć milionów");
  });

  it("pomija puste trójki", () => {
    expect(integerToPolishWords(1_000_005)).toBe("milion pięć");
  });

  it("odrzuca liczby ujemne i ułamkowe", () => {
    expect(() => integerToPolishWords(-1)).toThrow();
    expect(() => integerToPolishWords(1.5)).toThrow();
  });
});

describe("groszeToPolishWords", () => {
  it("typowy czynsz", () => {
    expect(groszeToPolishWords(240000)).toBe("dwa tysiące czterysta złotych 00/100");
  });

  it("zapisuje grosze cyframi", () => {
    expect(groszeToPolishWords(240050)).toBe("dwa tysiące czterysta złotych 50/100");
    expect(groszeToPolishWords(240005)).toBe("dwa tysiące czterysta złotych 05/100");
  });

  it("odmienia złoty według liczby", () => {
    expect(groszeToPolishWords(100)).toBe("jeden złoty 00/100");
    expect(groszeToPolishWords(200)).toBe("dwa złote 00/100");
    expect(groszeToPolishWords(500)).toBe("pięć złotych 00/100");
    expect(groszeToPolishWords(2200)).toBe("dwadzieścia dwa złote 00/100");
    expect(groszeToPolishWords(1200)).toBe("dwanaście złotych 00/100");
  });

  it("zero złotych", () => {
    expect(groszeToPolishWords(0)).toBe("zero złotych 00/100");
  });

  it("same grosze", () => {
    expect(groszeToPolishWords(1)).toBe("zero złotych 01/100");
  });

  it("kwoty ujemne (korekty)", () => {
    expect(groszeToPolishWords(-25000)).toBe("minus dwieście pięćdziesiąt złotych 00/100");
  });

  it("odrzuca kwotę ułamkową w groszach", () => {
    expect(() => groszeToPolishWords(100.5)).toThrow();
  });
});

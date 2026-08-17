import { describe, expect, it } from "vitest";

import { calculateInvoiceTotals, calculateLine } from "@/lib/invoices/totals";

describe("calculateLine", () => {
  it("czynsz zwolniony z VAT: brutto równe netto", () => {
    const line = calculateLine({
      description: "Czynsz najmu",
      quantityMilli: 1000,
      unitPriceNetGrosze: 240000,
      vatRate: "ZW",
    });

    expect(line.netGrosze).toBe(240000);
    expect(line.vatGrosze).toBe(0);
    expect(line.grossGrosze).toBe(240000);
  });

  it("nalicza 23% VAT", () => {
    const line = calculateLine({
      description: "Najem lokalu użytkowego",
      quantityMilli: 1000,
      unitPriceNetGrosze: 100000,
      vatRate: "RATE_23",
    });

    expect(line.netGrosze).toBe(100000);
    expect(line.vatGrosze).toBe(23000);
    expect(line.grossGrosze).toBe(123000);
  });

  it("nalicza VAT od kwoty, która wymaga zaokrąglenia", () => {
    // 333,33 zł × 23% = 76,6659 zł → 76,67 zł
    const line = calculateLine({
      description: "Usługa",
      quantityMilli: 1000,
      unitPriceNetGrosze: 33333,
      vatRate: "RATE_23",
    });

    expect(line.vatGrosze).toBe(7667);
    expect(line.grossGrosze).toBe(41000);
  });

  it("brutto zawsze równa się netto plus VAT", () => {
    for (const price of [1, 99, 33333, 240000, 987654]) {
      const line = calculateLine({
        description: "x",
        quantityMilli: 1000,
        unitPriceNetGrosze: price,
        vatRate: "RATE_8",
      });
      expect(line.grossGrosze).toBe(line.netGrosze + line.vatGrosze);
    }
  });

  it("liczy pozycję za media z ilością ułamkową", () => {
    // 4,235 m³ × 9,87 zł = 41,80 zł netto
    const line = calculateLine({
      description: "Woda zimna",
      quantityMilli: 4235,
      unit: "m³",
      unitPriceNetGrosze: 987,
      vatRate: "RATE_8",
    });

    expect(line.netGrosze).toBe(4180);
    expect(line.vatGrosze).toBe(334); // 41,80 × 8% = 3,344 → 3,34 zł
    expect(line.grossGrosze).toBe(4514);
  });

  it("traktuje NP i stawkę 0% jak zerowy podatek, ale jako osobne stawki", () => {
    const np = calculateLine({ description: "x", quantityMilli: 1000, unitPriceNetGrosze: 10000, vatRate: "NP" });
    const zero = calculateLine({ description: "x", quantityMilli: 1000, unitPriceNetGrosze: 10000, vatRate: "RATE_0" });

    expect(np.vatGrosze).toBe(0);
    expect(zero.vatGrosze).toBe(0);
    expect(np.vatRate).not.toBe(zero.vatRate);
  });
});

describe("calculateInvoiceTotals", () => {
  it("sumuje typową fakturę czynszową", () => {
    const totals = calculateInvoiceTotals([
      { description: "Czynsz", quantityMilli: 1000, unitPriceNetGrosze: 240000, vatRate: "ZW" },
      { description: "Zaliczka na media", quantityMilli: 1000, unitPriceNetGrosze: 45000, vatRate: "ZW" },
    ]);

    expect(totals.totalNetGrosze).toBe(285000);
    expect(totals.totalVatGrosze).toBe(0);
    expect(totals.totalGrossGrosze).toBe(285000);
  });

  it("sumuje VAT z pozycji, a nie od sumy netto", () => {
    // Trzy pozycje po 33,33 zł przy 23%: 7,67 × 3 = 23,01 zł.
    // Liczone od sumy (99,99 × 23% = 22,9977 → 23,00) wyszłoby o grosz mniej.
    const totals = calculateInvoiceTotals([
      { description: "a", quantityMilli: 1000, unitPriceNetGrosze: 3333, vatRate: "RATE_23" },
      { description: "b", quantityMilli: 1000, unitPriceNetGrosze: 3333, vatRate: "RATE_23" },
      { description: "c", quantityMilli: 1000, unitPriceNetGrosze: 3333, vatRate: "RATE_23" },
    ]);

    expect(totals.totalNetGrosze).toBe(9999);
    expect(totals.totalVatGrosze).toBe(2301);
    expect(totals.totalGrossGrosze).toBe(12300);
  });

  it("rozbija sumy po stawkach — czynsz zw. plus prąd 23%", () => {
    const totals = calculateInvoiceTotals([
      { description: "Czynsz", quantityMilli: 1000, unitPriceNetGrosze: 240000, vatRate: "ZW" },
      { description: "Prąd", quantityMilli: 1000, unitPriceNetGrosze: 12000, vatRate: "RATE_23" },
    ]);

    expect(totals.vatBreakdown).toHaveLength(2);

    const exempt = totals.vatBreakdown.find((row) => row.rate === "ZW");
    const standard = totals.vatBreakdown.find((row) => row.rate === "RATE_23");

    expect(exempt).toEqual({ rate: "ZW", netGrosze: 240000, vatGrosze: 0 });
    expect(standard).toEqual({ rate: "RATE_23", netGrosze: 12000, vatGrosze: 2760 });
    expect(totals.totalGrossGrosze).toBe(254760);
  });

  it("scala pozycje o tej samej stawce w jeden wiersz rozbicia", () => {
    const totals = calculateInvoiceTotals([
      { description: "a", quantityMilli: 1000, unitPriceNetGrosze: 10000, vatRate: "RATE_23" },
      { description: "b", quantityMilli: 1000, unitPriceNetGrosze: 20000, vatRate: "RATE_23" },
    ]);

    expect(totals.vatBreakdown).toHaveLength(1);
    expect(totals.vatBreakdown[0]).toEqual({ rate: "RATE_23", netGrosze: 30000, vatGrosze: 6900 });
  });

  it("pusta faktura daje zera, a nie NaN", () => {
    const totals = calculateInvoiceTotals([]);
    expect(totals.totalNetGrosze).toBe(0);
    expect(totals.totalGrossGrosze).toBe(0);
    expect(totals.vatBreakdown).toEqual([]);
  });
});

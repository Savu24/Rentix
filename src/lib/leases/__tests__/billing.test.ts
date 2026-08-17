import { describe, expect, it } from "vitest";

import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import {
  buildBillingPeriod,
  buildRentInvoiceLines,
  clampBillingDay,
  daysInMonth,
  prorateRent,
  type BillingLease,
} from "@/lib/leases/billing";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const lease = (overrides: Partial<BillingLease> = {}): BillingLease => ({
  startDate: utc("2026-01-01"),
  endDate: null,
  rentGrosze: 240000,
  utilitiesMode: "FLAT_RATE",
  utilitiesAdvanceGrosze: 45000,
  billingDay: 1,
  paymentTermDays: 10,
  ...overrides,
});

describe("daysInMonth", () => {
  it("zna długości miesięcy i lata przestępne", () => {
    expect(daysInMonth(2026, 0)).toBe(31); // styczeń
    expect(daysInMonth(2026, 1)).toBe(28); // luty 2026
    expect(daysInMonth(2028, 1)).toBe(29); // luty 2028 — przestępny
    expect(daysInMonth(2026, 3)).toBe(30); // kwiecień
  });
});

describe("clampBillingDay", () => {
  it("przycina do 28, żeby luty nie wymagał wyjątku", () => {
    expect(clampBillingDay(31)).toBe(28);
    expect(clampBillingDay(29)).toBe(28);
  });

  it("nie schodzi poniżej 1", () => {
    expect(clampBillingDay(0)).toBe(1);
    expect(clampBillingDay(-5)).toBe(1);
  });

  it("przepuszcza wartości prawidłowe", () => {
    expect(clampBillingDay(10)).toBe(10);
  });
});

describe("buildBillingPeriod", () => {
  it("pełny miesiąc obejmuje cały okres", () => {
    const period = buildBillingPeriod(lease(), 2026, 7); // sierpień
    expect(period).not.toBeNull();
    expect(period!.periodStart).toEqual(utc("2026-08-01"));
    expect(period!.periodEnd).toEqual(utc("2026-08-31"));
    expect(period!.coveredDays).toBe(31);
    expect(period!.totalDays).toBe(31);
  });

  it("liczy termin płatności od daty wystawienia", () => {
    const period = buildBillingPeriod(lease({ billingDay: 5, paymentTermDays: 14 }), 2026, 7);
    expect(period!.issueDate).toEqual(utc("2026-08-05"));
    expect(period!.dueDate).toEqual(utc("2026-08-19"));
  });

  it("data sprzedaży to ostatni dzień okresu usługi (wymóg FA(2))", () => {
    const period = buildBillingPeriod(lease(), 2026, 7);
    expect(period!.saleDate).toEqual(utc("2026-08-31"));
  });

  it("umowa zaczynająca się w połowie miesiąca obejmuje tylko część dni", () => {
    const period = buildBillingPeriod(lease({ startDate: utc("2026-08-15") }), 2026, 7);
    expect(period!.periodStart).toEqual(utc("2026-08-15"));
    expect(period!.coveredDays).toBe(17); // 15–31 sierpnia włącznie
  });

  it("umowa kończąca się w połowie miesiąca urywa okres", () => {
    const period = buildBillingPeriod(lease({ endDate: utc("2026-08-10") }), 2026, 7);
    expect(period!.periodEnd).toEqual(utc("2026-08-10"));
    expect(period!.coveredDays).toBe(10);
  });

  it("zwraca null, gdy umowa jeszcze nie obowiązuje", () => {
    expect(buildBillingPeriod(lease({ startDate: utc("2026-09-01") }), 2026, 7)).toBeNull();
  });

  it("zwraca null, gdy umowa już wygasła", () => {
    expect(buildBillingPeriod(lease({ endDate: utc("2026-07-31") }), 2026, 7)).toBeNull();
  });

  it("obejmuje dokładnie jeden dzień, gdy umowa zaczyna się ostatniego dnia miesiąca", () => {
    const period = buildBillingPeriod(lease({ startDate: utc("2026-08-31") }), 2026, 7);
    expect(period!.coveredDays).toBe(1);
  });
});

describe("prorateRent", () => {
  it("pełny miesiąc to pełny czynsz", () => {
    const period = buildBillingPeriod(lease(), 2026, 7)!;
    expect(prorateRent(240000, period)).toBe(240000);
  });

  it("dzieli przez liczbę dni tego miesiąca, nie przez 30", () => {
    // 17 z 31 dni sierpnia: 2400 × 17/31 = 1316,129… → 1316,13 zł
    const august = buildBillingPeriod(lease({ startDate: utc("2026-08-15") }), 2026, 7)!;
    expect(prorateRent(240000, august)).toBe(131613);

    // Ta sama „połowa miesiąca" w lutym daje inną kwotę — i tak ma być.
    const february = buildBillingPeriod(lease({ startDate: utc("2026-02-15") }), 2026, 1)!;
    expect(february.coveredDays).toBe(14);
    expect(prorateRent(240000, february)).toBe(120000); // 2400 × 14/28
  });

  it("jeden dzień to proporcjonalnie jeden dzień", () => {
    const period = buildBillingPeriod(lease({ startDate: utc("2026-08-31") }), 2026, 7)!;
    expect(prorateRent(240000, period)).toBe(7742); // 2400 × 1/31 = 77,419… zł
  });
});

describe("buildRentInvoiceLines", () => {
  it("czynsz plus zaliczka na media przy trybie FLAT_RATE", () => {
    const period = buildBillingPeriod(lease(), 2026, 7)!;
    const lines = buildRentInvoiceLines(lease(), period, 2026, 7);

    expect(lines).toHaveLength(2);
    expect(lines[0].description).toBe("Czynsz najmu — sierpień 2026");
    expect(lines[0].unitPriceNetGrosze).toBe(240000);
    expect(lines[1].description).toBe("Zaliczka na media — sierpień 2026");
    expect(lines[1].unitPriceNetGrosze).toBe(45000);
  });

  it("tryb INCLUDED nie dokłada pozycji za media", () => {
    const l = lease({ utilitiesMode: "INCLUDED" });
    const period = buildBillingPeriod(l, 2026, 7)!;
    expect(buildRentInvoiceLines(l, period, 2026, 7)).toHaveLength(1);
  });

  it("tryb METERED nie dokłada zaliczki — media wyjdą z odczytów liczników", () => {
    const l = lease({ utilitiesMode: "METERED" });
    const period = buildBillingPeriod(l, 2026, 7)!;
    expect(buildRentInvoiceLines(l, period, 2026, 7)).toHaveLength(1);
  });

  it("pomija zaliczkę zerową, żeby nie generować pustej pozycji", () => {
    const l = lease({ utilitiesMode: "FLAT_RATE", utilitiesAdvanceGrosze: 0 });
    const period = buildBillingPeriod(l, 2026, 7)!;
    expect(buildRentInvoiceLines(l, period, 2026, 7)).toHaveLength(1);
  });

  it("opisuje proporcjonalny okres wprost na pozycji", () => {
    const l = lease({ startDate: utc("2026-08-15") });
    const period = buildBillingPeriod(l, 2026, 7)!;
    const lines = buildRentInvoiceLines(l, period, 2026, 7);

    expect(lines[0].description).toBe("Czynsz najmu — sierpień 2026 (17/31 dni)");
    expect(lines[0].unitPriceNetGrosze).toBe(131613);
    expect(lines[1].unitPriceNetGrosze).toBe(24677); // 450 × 17/31
  });

  it("domyślnie stosuje zwolnienie z VAT — najem mieszkaniowy", () => {
    const period = buildBillingPeriod(lease(), 2026, 7)!;
    const lines = buildRentInvoiceLines(lease(), period, 2026, 7);
    expect(lines.every((line) => line.vatRate === "ZW")).toBe(true);
  });

  it("składa się z sumami faktury w pełną kwotę do zapłaty", () => {
    const period = buildBillingPeriod(lease(), 2026, 7)!;
    const totals = calculateInvoiceTotals(buildRentInvoiceLines(lease(), period, 2026, 7));

    expect(totals.totalGrossGrosze).toBe(285000); // 2400 + 450 zł
    expect(totals.totalVatGrosze).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import { calculateInvoiceTotals } from "@/lib/invoices/totals";
import {
  buildBillingPeriod,
  buildRentInvoiceLines,
  clampBillingDay,
  daysInMonth,
  prorateRent,
  shouldBillPeriod,
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

describe("data wystawienia nie wyprzedza okresu", () => {
  // Zgłoszone z produkcji: umowa zawarta 17. sierpnia, dzień naliczania 1.,
  // termin płatności 5 dni. Dokument wychodził z datą wystawienia 1 sierpnia
  // i terminem 6 sierpnia — obie przed powstaniem umowy.
  const midMonth = lease({
    startDate: new Date(Date.UTC(2026, 7, 17)),
    billingDay: 1,
    paymentTermDays: 5,
  });

  it("pierwszy, niepełny miesiąc wystawia się w dniu zawarcia umowy", () => {
    const period = buildBillingPeriod(midMonth, 2026, 7)!;

    expect(period.issueDate.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(period.dueDate.toISOString()).toBe("2026-08-22T00:00:00.000Z");
    expect(period.saleDate.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("kolejny miesiąc wraca do dnia naliczania z umowy", () => {
    const period = buildBillingPeriod(midMonth, 2026, 8)!;

    expect(period.issueDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(period.dueDate.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  });

  it("dzień naliczania późniejszy niż start umowy zostaje bez zmian", () => {
    // Umowa od 3., naliczanie 10. — nie ma powodu przyspieszać wystawienia.
    const period = buildBillingPeriod(
      lease({ startDate: new Date(Date.UTC(2026, 7, 3)), billingDay: 10, paymentTermDays: 5 }),
      2026,
      7,
    )!;

    expect(period.issueDate.toISOString()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("termin płatności nigdy nie wypada przed wystawieniem", () => {
    for (const day of [1, 5, 17, 28]) {
      const period = buildBillingPeriod(
        lease({ startDate: new Date(Date.UTC(2026, 7, day)), billingDay: 1, paymentTermDays: 0 }),
        2026,
        7,
      )!;

      expect(period.dueDate.getTime()).toBeGreaterThanOrEqual(period.issueDate.getTime());
      expect(period.issueDate.getTime()).toBeGreaterThanOrEqual(period.periodStart.getTime());
    }
  });
});


describe("shouldBillPeriod", () => {
  const periodFor = (year: number, month: number, overrides: Partial<BillingLease> = {}) =>
    buildBillingPeriod(lease(overrides), year, month)!;

  it("bez daty odcięcia nalicza wszystko", () => {
    expect(shouldBillPeriod(periodFor(2026, 7), null)).toBe(true);
    expect(shouldBillPeriod(periodFor(2026, 7), undefined)).toBe(true);
  });

  it("pomija miesiące rozliczone w poprzednim programie", () => {
    const cutoff = utc("2026-09-01");

    expect(shouldBillPeriod(periodFor(2026, 5), cutoff)).toBe(false); // czerwiec
    expect(shouldBillPeriod(periodFor(2026, 6), cutoff)).toBe(false); // lipiec
    expect(shouldBillPeriod(periodFor(2026, 7), cutoff)).toBe(false); // sierpień
    expect(shouldBillPeriod(periodFor(2026, 8), cutoff)).toBe(true); // wrzesień
    expect(shouldBillPeriod(periodFor(2026, 9), cutoff)).toBe(true); // październik
  });

  it("odcina całymi okresami — miesiąc zaczyna się przed datą, więc odpada w całości", () => {
    // Data w środku miesiąca to zwykle pomyłka, ale nie może doprowadzić do
    // dokumentu za dni, które rozliczył już poprzedni system.
    expect(shouldBillPeriod(periodFor(2026, 8), utc("2026-09-15"))).toBe(false);
    expect(shouldBillPeriod(periodFor(2026, 9), utc("2026-09-15"))).toBe(true);
  });

  it("pierwszy niepełny miesiąc liczy się od początku najmu, nie od pierwszego dnia miesiąca", () => {
    // Umowa od 17 września, odcięcie na 10 września: okres zaczyna się 17.,
    // czyli po dacie odcięcia — naliczamy.
    const period = periodFor(2026, 8, { startDate: utc("2026-09-17") });

    expect(shouldBillPeriod(period, utc("2026-09-10"))).toBe(true);
    expect(shouldBillPeriod(period, utc("2026-09-18"))).toBe(false);
  });

  it("data wcześniejsza niż początek umowy niczego nie odcina", () => {
    expect(shouldBillPeriod(periodFor(2026, 7), utc("2020-01-01"))).toBe(true);
  });
});

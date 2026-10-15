import { describe, expect, it, vi } from "vitest";

// Moduł czyta konfigurację i bazę przy imporcie — tu sprawdzamy tylko
// odwzorowanie cen na plany, więc oba zastępujemy pustymi.
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { PAID_PLANS, planFromLookupKey, priceLookupKey, rentFeeFor, rentFeeLookupKey, sellsPlansIn } =
  await import("../stripe");

describe("rentFeeFor", () => {
  it("liczy 0,1% czynszu w groszach", () => {
    // 20 000 zł czynszu → 20 zł opłaty
    expect(rentFeeFor(2_000_000)).toBe(2_000);
    expect(rentFeeFor(0)).toBe(0);
  });

  it("zaokrągla do pełnego grosza", () => {
    // 2 345,67 zł → 2,35 zł (234,567 gr)
    expect(rentFeeFor(234_567)).toBe(235);
    expect(rentFeeFor(499)).toBe(0);
  });

  it("opłata od czynszu jest tylko tam, gdzie sprzedajemy plany", () => {
    expect(rentFeeLookupKey("pl")).toBe("rent_fee_monthly");
    expect(rentFeeLookupKey("uk")).toBeNull();
  });
});

describe("priceLookupKey / planFromLookupKey", () => {
  it("klucz ceny wraca do tego samego planu", () => {
    for (const plan of PAID_PLANS) {
      expect(planFromLookupKey(priceLookupKey(plan, "pl"))).toBe(plan);
    }
  });

  it("używa kluczy wpisanych przy cenach w panelu Stripe", () => {
    expect(priceLookupKey("START", "pl")).toBe("start_monthly");
    expect(priceLookupKey("PRO", "pl")).toBe("pro_monthly");
    expect(priceLookupKey("PORTFOLIO", "pl")).toBe("portfel_monthly");
  });

  it("wersja UK nie ma jeszcze cen", () => {
    expect(sellsPlansIn("pl")).toBe(true);
    expect(sellsPlansIn("uk")).toBe(false);
    expect(priceLookupKey("PRO", "uk")).toBeNull();
  });

  it("odrzuca ceny spoza cennika", () => {
    expect(planFromLookupKey(null)).toBeNull();
    expect(planFromLookupKey("free_monthly")).toBeNull();
    expect(planFromLookupKey("price_123")).toBeNull();
  });
});

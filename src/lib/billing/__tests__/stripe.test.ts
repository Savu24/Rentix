import { describe, expect, it, vi } from "vitest";

// Moduł czyta konfigurację i bazę przy imporcie — tu sprawdzamy tylko
// odwzorowanie cen na plany, więc oba zastępujemy pustymi.
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { PAID_PLANS, planFromLookupKey, priceLookupKey, sellsPlansIn } = await import("../stripe");

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

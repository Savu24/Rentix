import { describe, expect, it } from "vitest";

import { DEFAULT_PLAN, PLAN_LEASE_LIMIT, planUsage } from "@/lib/billing/plans";

/**
 * Testujemy samą decyzję o limicie, bez Prismy: liczba umów wchodzi
 * parametrem, tak jak wchodzi do `planUsage` w kodzie produkcyjnym.
 */

describe("progi planów", () => {
  it("każdy plan ma swój próg, a Portfel go nie ma", () => {
    expect(PLAN_LEASE_LIMIT.FREE).toBe(2);
    expect(PLAN_LEASE_LIMIT.START).toBe(10);
    expect(PLAN_LEASE_LIMIT.PRO).toBe(30);
    expect(PLAN_LEASE_LIMIT.PORTFOLIO).toBeNull();
  });

  it("konto bez subskrypcji jest darmowe z domyślnym progiem", () => {
    const usage = planUsage(DEFAULT_PLAN, undefined, 0);

    expect(usage.plan).toBe("FREE");
    expect(usage.limit).toBe(2);
    expect(usage.hasCapacity).toBe(true);
  });
});

describe("zużycie limitu", () => {
  it("przepuszcza, dopóki jest miejsce", () => {
    expect(planUsage("START", null, 9).hasCapacity).toBe(true);
    expect(planUsage("START", null, 9).remaining).toBe(1);
  });

  it("blokuje po zajęciu ostatniego miejsca", () => {
    const usage = planUsage("START", null, 10);

    expect(usage.hasCapacity).toBe(false);
    expect(usage.remaining).toBe(0);
  });

  it("nie schodzi poniżej zera, gdy limit obniżono pod istniejącymi umowami", () => {
    const usage = planUsage("FREE", null, 7);

    expect(usage.remaining).toBe(0);
    expect(usage.hasCapacity).toBe(false);
  });

  it("Portfel przepuszcza zawsze i nie liczy pozostałych miejsc", () => {
    const usage = planUsage("PORTFOLIO", null, 400);

    expect(usage.limit).toBeNull();
    expect(usage.remaining).toBeNull();
    expect(usage.hasCapacity).toBe(true);
  });
});

describe("próg zapisany w subskrypcji", () => {
  it("wygrywa z domyślnym progiem planu", () => {
    // Konta sprzed cennika: plan darmowy, ale dwadzieścia umów z obietnicy.
    const usage = planUsage("FREE", 20, 15);

    expect(usage.limit).toBe(20);
    expect(usage.hasCapacity).toBe(true);
  });

  it("działa też w dół — obniżony próg blokuje mimo wyższego planu", () => {
    expect(planUsage("PRO", 5, 5).hasCapacity).toBe(false);
  });

  it("zero traktujemy jak próg, a nie jak brak wartości", () => {
    const usage = planUsage("FREE", 0, 0);

    expect(usage.limit).toBe(0);
    expect(usage.hasCapacity).toBe(false);
  });
});

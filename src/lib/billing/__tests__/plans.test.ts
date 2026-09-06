import { describe, expect, it } from "vitest";

import { DEFAULT_PLAN, PLAN_LEASE_LIMIT, PLAN_PRICE, planUsage } from "@/lib/billing/plans";
import { getDictionary } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/config";

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

/**
 * Cennik żyje w dwóch miejscach: jako tekst na karcie planu (słownik) i jako
 * liczba do sumowania (`PLAN_PRICE`). Bez tego testu podniesienie ceny w jednym
 * z nich przechodziłoby bez drugiego, a panel administratora liczyłby przychód
 * po starym cenniku — i nikt by tego nie zauważył.
 */
describe("cena planu", () => {
  const PLAN_ORDER = ["FREE", "START", "PRO", "PORTFOLIO"] as const;

  /** „39 zł" → 3900, „£24" → 2400, „0 zł" → 0. */
  function toMinorUnits(price: string): number {
    return Math.round(Number(price.replace(/[^\d.,]/g, "").replace(",", ".")) * 100);
  }

  it.each(LOCALES)("zgadza się z cennikiem pokazywanym klientowi (%s)", (locale) => {
    const cards = getDictionary(locale).marketing.pricing.plans;

    expect(cards).toHaveLength(PLAN_ORDER.length);

    PLAN_ORDER.forEach((plan, index) => {
      expect(toMinorUnits(cards[index]!.price)).toBe(PLAN_PRICE[locale][plan]);
    });
  });

  it("plan darmowy nic nie kosztuje, a każdy kolejny kosztuje więcej", () => {
    for (const locale of LOCALES) {
      const prices = PLAN_ORDER.map((plan) => PLAN_PRICE[locale][plan]);

      expect(prices[0]).toBe(0);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }
  });
});

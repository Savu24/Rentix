import { describe, expect, it } from "vitest";

import {
  CALCULATOR_MAX_LEASES,
  CALCULATOR_RENT,
  estimatePlan,
  planForLeases,
} from "@/lib/billing/calculator";
import { PLAN_LEASE_LIMIT, PLAN_PRICE } from "@/lib/billing/plans";
import { LOCALES } from "@/lib/i18n/config";

describe("dobór planu do liczby umów", () => {
  it("zaczyna od darmowego i przechodzi próg po progu", () => {
    expect(planForLeases(0)).toBe("FREE");
    expect(planForLeases(2)).toBe("FREE");
    expect(planForLeases(3)).toBe("START");
    expect(planForLeases(10)).toBe("START");
    expect(planForLeases(11)).toBe("PRO");
    expect(planForLeases(30)).toBe("PRO");
    expect(planForLeases(31)).toBe("PORTFOLIO");
  });

  it("powyżej ostatniego progu zostaje plan bez limitu", () => {
    expect(planForLeases(CALCULATOR_MAX_LEASES)).toBe("PORTFOLIO");
    expect(planForLeases(5000)).toBe("PORTFOLIO");
  });

  it("liczbę ujemną i ułamek traktuje jak pełne umowy", () => {
    expect(planForLeases(-4)).toBe("FREE");
    expect(planForLeases(10.9)).toBe("START");
  });

  it("idzie po progach z cennika, nie po własnej liście", () => {
    // Gdyby ktoś podniósł próg w `PLAN_LEASE_LIMIT`, kalkulator ma pójść
    // za nim — ten test pilnuje, że nie ma tu drugiego, zapomnianego cennika.
    expect(planForLeases(PLAN_LEASE_LIMIT.START!)).toBe("START");
    expect(planForLeases(PLAN_LEASE_LIMIT.START! + 1)).toBe("PRO");
  });
});

describe("udział abonamentu w czynszu", () => {
  it("liczy ułamek ceny w czynszu z całego portfela", () => {
    // 30 umów po 2500 zł to 75 000 zł czynszu; Pro kosztuje 99 zł.
    const estimate = estimatePlan(30, 250_000, "pl");

    expect(estimate.plan).toBe("PRO");
    expect(estimate.priceGrosze).toBe(PLAN_PRICE.pl.PRO);
    expect(estimate.rentRollGrosze).toBe(7_500_000);
    expect(estimate.shareOfRent).toBeCloseTo(0.00132, 5);
  });

  it("na planie darmowym udział jest zerowy, a nie pusty", () => {
    expect(estimatePlan(2, 250_000, "pl").shareOfRent).toBe(0);
  });

  it("bez czynszu nie podaje udziału zamiast dzielić przez zero", () => {
    const estimate = estimatePlan(12, 0, "pl");

    expect(estimate.rentRollGrosze).toBe(0);
    expect(estimate.shareOfRent).toBeNull();
  });

  it("maleje z każdą kolejną umową w tym samym progu", () => {
    const first = estimatePlan(11, 250_000, "pl").shareOfRent!;
    const last = estimatePlan(30, 250_000, "pl").shareOfRent!;

    expect(last).toBeLessThan(first);
  });

  it("bierze ceny z wersji krajowej, nie przelicza polskich", () => {
    expect(estimatePlan(20, 120_000, "uk").priceGrosze).toBe(PLAN_PRICE.uk.PRO);
  });
});

describe("widełki suwaków", () => {
  it.each(LOCALES)("mają sens dla wersji %s", (locale) => {
    const rent = CALCULATOR_RENT[locale];

    expect(rent.min).toBeLessThan(rent.default);
    expect(rent.default).toBeLessThan(rent.max);
    // Wartość początkowa musi trafiać w skok suwaka, inaczej pierwszy ruch
    // przeskakuje o resztę z dzielenia i kwota „skacze" bez powodu.
    expect((rent.default - rent.min) % rent.step).toBe(0);
    expect((rent.max - rent.min) % rent.step).toBe(0);
  });
});

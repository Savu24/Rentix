import { describe, expect, it } from "vitest";

import {
  CALCULATOR_MAX_LEASES,
  CALCULATOR_RENT,
  estimatePlan,
  planForLeases,
} from "@/lib/billing/calculator";
import {
  PLAN_LEASE_LIMIT,
  PLAN_PRICE,
  RENT_FEE_THRESHOLD_GROSZE,
  rentFeeFor,
} from "@/lib/billing/plans";
import { LOCALES } from "@/lib/i18n/config";

describe("dobór planu do liczby umów", () => {
  it("zaczyna od darmowego i przechodzi próg po progu", () => {
    expect(planForLeases(0)).toBe("FREE");
    expect(planForLeases(3)).toBe("FREE");
    expect(planForLeases(4)).toBe("START");
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

describe("opłata od czynszu", () => {
  it("do 20 000 zł czynszu nie ma opłaty", () => {
    expect(rentFeeFor(0)).toBe(0);
    expect(rentFeeFor(RENT_FEE_THRESHOLD_GROSZE)).toBe(0);
  });

  it("liczy 0,1% tylko od nadwyżki ponad próg, zaokrąglone do grosza", () => {
    // 25 000 zł → nadwyżka 5000 zł → 5 zł
    expect(rentFeeFor(2_500_000)).toBe(500);
    // 20 001,23 zł → nadwyżka 1,23 zł → 0,123 gr → 0 gr
    expect(rentFeeFor(2_000_123)).toBe(0);
    // 22 345,67 zł → nadwyżka 2345,67 zł → 234,567 gr → 235 gr
    expect(rentFeeFor(2_234_567)).toBe(235);
  });

  it("kalkulator dolicza opłatę do planu płatnego ponad próg", () => {
    // 30 umów po 2500 zł = 75 000 zł → nadwyżka 55 000 zł → 55 zł; Pro 99 zł.
    const estimate = estimatePlan(30, 250_000, "pl");

    expect(estimate.rentFeeGrosze).toBe(5_500);
    expect(estimate.totalGrosze).toBe(PLAN_PRICE.pl.PRO + 5_500);
  });

  it("poniżej progu płacisz sam plan", () => {
    // 8 umów po 2500 zł = 20 000 zł — dokładnie próg.
    const estimate = estimatePlan(8, 250_000, "pl");

    expect(estimate.rentFeeGrosze).toBe(0);
    expect(estimate.totalGrosze).toBe(PLAN_PRICE.pl.START);
  });

  it("plan Free i wersja UK nie płacą opłaty", () => {
    expect(estimatePlan(2, 1_000_000, "pl").rentFeeGrosze).toBe(0);
    expect(estimatePlan(60, 400_000, "uk").rentFeeGrosze).toBe(0);
  });
});

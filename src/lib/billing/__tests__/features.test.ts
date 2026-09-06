import { describe, expect, it } from "vitest";

import type { SubscriptionPlan } from "@/generated/prisma/enums";
import {
  FEATURE_MIN_PLAN,
  PLAN_FEATURES,
  PLAN_ORDER,
  planAllows,
  planFeatures,
  requiredPlan,
  type PlanFeature,
} from "@/lib/billing/features";

/**
 * Bramka planu bez Prismy — plan wchodzi parametrem, tak samo jak w kodzie
 * produkcyjnym, gdzie odczytuje go `organizationAllows`.
 */

/** Obietnice cennika przy planie Start. */
const START_FEATURES: PlanFeature[] = ["DOCUMENT_LOGO", "EMAIL_DELIVERY", "ANNUAL_REPORT"];

/** Obietnice cennika przy planie Pro. */
const PRO_FEATURES: PlanFeature[] = [
  "MESSAGE_TEMPLATES",
  "TEAM",
  "ACCOUNTING_EXPORT",
  "TENANT_PORTAL",
];

describe("funkcje bramkowane planem", () => {
  it("logo, wysyłka mailem i zestawienie roczne wchodzą od planu Start", () => {
    for (const feature of START_FEATURES) {
      expect(requiredPlan(feature)).toBe("START");
      expect(planAllows("FREE", feature)).toBe(false);
      expect(planAllows("START", feature)).toBe(true);
    }
  });

  it("zespół, eksport, portal i własne szablony wchodzą od planu Pro", () => {
    for (const feature of PRO_FEATURES) {
      expect(requiredPlan(feature)).toBe("PRO");
      expect(planAllows("FREE", feature)).toBe(false);
      expect(planAllows("START", feature)).toBe(false);
      expect(planAllows("PRO", feature)).toBe(true);
    }
  });

  it("wyższy próg ma wszystko z niższego", () => {
    for (const feature of [...START_FEATURES, ...PRO_FEATURES]) {
      expect(planAllows("PORTFOLIO", feature)).toBe(true);
    }
  });

  it("każda bramkowana funkcja jest wymieniona w teście", () => {
    // Nowa funkcja dołożona do mapy, a zapomniana tutaj, ma się objawić
    // czerwonym testem — inaczej próg wszedłby do kodu niesprawdzony.
    expect([...PLAN_FEATURES].sort()).toEqual([...START_FEATURES, ...PRO_FEATURES].sort());
  });

  it("zestaw dla konta rośnie razem z progiem", () => {
    expect(planFeatures("FREE")).toEqual([]);
    expect([...planFeatures("START")].sort()).toEqual([...START_FEATURES].sort());
    expect([...planFeatures("PRO")].sort()).toEqual(
      [...START_FEATURES, ...PRO_FEATURES].sort(),
    );
    expect(planFeatures("PORTFOLIO")).toHaveLength(PLAN_FEATURES.length);
  });

  it("kolejność progów zgadza się z progami z cennika", () => {
    expect(PLAN_ORDER).toEqual(["FREE", "START", "PRO", "PORTFOLIO"]);
  });

  it("plan spoza kolejności dostaje odmowę, a nie ciche przejście", () => {
    // Nowy próg dołożony do enuma, a zapomniany w `PLAN_ORDER`. Ma się objawić
    // zablokowaną funkcją i zgłoszeniem, nie otwarciem wszystkiego.
    const unknown = "ENTERPRISE" as SubscriptionPlan;

    expect(planAllows(unknown, "TEAM")).toBe(false);
  });

  it("każda funkcja ma próg z listy planów", () => {
    for (const [, plan] of Object.entries(FEATURE_MIN_PLAN)) {
      expect(PLAN_ORDER).toContain(plan);
    }
  });
});

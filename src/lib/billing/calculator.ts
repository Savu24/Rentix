import type { SubscriptionPlan } from "@/generated/prisma/enums";
import type { Locale } from "@/lib/i18n/config";

import { PLAN_ORDER } from "./features";
import { PLAN_LEASE_LIMIT, PLAN_PRICE } from "./plans";

/**
 * Kalkulator kosztu z cennika.
 *
 * Odwiedzający podaje dwie rzeczy, które zna na pamięć — ile ma umów i ile
 * średnio bierze czynszu — a strona odpowiada planem, kwotą i **udziałem
 * abonamentu w czynszu**. Ten ostatni jest tu najważniejszy: konkurencja
 * liczy sobie ułamek procenta od przychodu, więc dopóki nasza cena jest
 * płaska, jedyny sposób, żeby to było widać, to pokazać ją w tej samej
 * jednostce. Przy trzydziestu umowach wychodzi ułamek promila, a to argument,
 * którego żadna tabelka progów nie przekaże.
 *
 * Logika siedzi osobno od komponentu, bo jest arytmetyką, a nie widokiem:
 * da się ją sprawdzić testem bez renderowania i bez przeglądarki.
 */

/** Skrajne wartości suwaka umów. Powyżej i tak jest Portfel bez limitu. */
export const CALCULATOR_MAX_LEASES = 60;
export const CALCULATOR_DEFAULT_LEASES = 8;

/**
 * Widełki czynszu per wersja krajowa, w groszach i pensach.
 *
 * Osobno na kraj, tak samo jak ceny planów: średni czynsz w Polsce i w Wielkiej
 * Brytanii to inne rzędy wielkości, a suwak ma się zatrzymywać tam, gdzie
 * kończą się prawdziwe stawki, nie tam, gdzie wypadł przelicznik.
 */
export const CALCULATOR_RENT: Record<
  Locale,
  { min: number; max: number; step: number; default: number }
> = {
  pl: { min: 50_000, max: 1_000_000, step: 10_000, default: 250_000 },
  uk: { min: 30_000, max: 400_000, step: 5_000, default: 120_000 },
};

/**
 * Najtańszy plan, w którym mieści się tyle umów.
 *
 * Kolejność bierzemy z `PLAN_ORDER`, a progi z `PLAN_LEASE_LIMIT` — kalkulator
 * nie zna własnej listy planów, więc dołożenie progu w cenniku nie wymaga
 * poprawki tutaj. `null` w limicie to plan bez limitu i zarazem ostatnia deska:
 * przy liczbie umów spoza wszystkich progów wracamy właśnie nim.
 */
export function planForLeases(leases: number): SubscriptionPlan {
  const needed = Math.max(0, Math.trunc(leases));

  const match = PLAN_ORDER.find((plan) => {
    const limit = PLAN_LEASE_LIMIT[plan];
    return limit === null || needed <= limit;
  });

  return match ?? PLAN_ORDER[PLAN_ORDER.length - 1]!;
}

export type PlanEstimate = {
  plan: SubscriptionPlan;
  /** Cena planu w groszach — do formatowania i do udziału. */
  priceGrosze: number;
  /** Czynsz z całego portfela miesięcznie: umowy razy średnia stawka. */
  rentRollGrosze: number;
  /**
   * Udział abonamentu w czynszu jako **ułamek**, nie procent: 0,0013 to 0,13%.
   * `null`, gdy czynszu nie ma — dzielenie przez zero nie jest odpowiedzią,
   * a „0%" przy zerowym portfelu kłamałoby w drugą stronę.
   */
  shareOfRent: number | null;
};

export function estimatePlan(
  leases: number,
  averageRentGrosze: number,
  locale: Locale,
): PlanEstimate {
  const count = Math.max(0, Math.trunc(leases));
  const rent = Math.max(0, Math.trunc(averageRentGrosze));

  const plan = planForLeases(count);
  const priceGrosze = PLAN_PRICE[locale][plan];
  const rentRollGrosze = count * rent;

  return {
    plan,
    priceGrosze,
    rentRollGrosze,
    shareOfRent: rentRollGrosze > 0 ? priceGrosze / rentRollGrosze : null,
  };
}

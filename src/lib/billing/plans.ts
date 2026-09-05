import type { SubscriptionPlan } from "@/generated/prisma/enums";

/**
 * Plany i limity kont.
 *
 * Jednostką rozliczeniową jest **umowa najmu**, nie najemca. Powód jest
 * praktyczny: pięciopokojowe mieszkanie w najmie pokojowym to pięciu najemców,
 * ale pięć umów albo jedna — zależnie od tego, jak wynajmujący je podpisał.
 * Liczenie najemców wyceniałoby najdrożej dokładnie ten scenariusz, który
 * Rentix obsługuje lepiej niż konkurencja. Umowa jest też jednostką, którą
 * wynajmujący liczy sam, więc rachunek da się sprawdzić bez zaglądania w panel.
 */

/** Domyślny próg planu. `null` = bez limitu. */
export const PLAN_LEASE_LIMIT: Record<SubscriptionPlan, number | null> = {
  FREE: 2,
  START: 10,
  PRO: 30,
  PORTFOLIO: null,
};

export const DEFAULT_PLAN: SubscriptionPlan = "FREE";

export type PlanUsage = {
  plan: SubscriptionPlan;
  /** Próg konta: z subskrypcji, a w jej braku z planu. `null` = bez limitu. */
  limit: number | null;
  /** Umowy poza archiwum — wszystkie statusy, patrz `countLeases`. */
  used: number;
  /** Ile jeszcze wejdzie. `null` przy braku limitu. */
  remaining: number | null;
  /** Czy da się założyć kolejną umowę. */
  hasCapacity: boolean;
};

/**
 * Rozstrzyga, czy konto mieści jeszcze jedną umowę.
 *
 * Czysta funkcja — bazę odpytuje `organizationPlan()` z `./server`. Dzięki temu
 * decyzja da się przetestować bez Prismy, a próg z subskrypcji ma
 * pierwszeństwo przed domyślnym progiem planu: tędy wchodzą konta sprzed
 * cennika, którym obiecano dwadzieścia umów.
 */
export function planUsage(
  plan: SubscriptionPlan,
  storedLimit: number | null | undefined,
  used: number,
): PlanUsage {
  const limit = storedLimit ?? PLAN_LEASE_LIMIT[plan];

  return {
    plan,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    hasCapacity: limit === null || used < limit,
  };
}


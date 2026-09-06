import type { SubscriptionPlan } from "@/generated/prisma/enums";
import type { Locale } from "@/lib/i18n/config";

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

/**
 * Cena miesięczna planu w najmniejszej jednostce waluty — grosze albo pensy.
 *
 * Klient widzi ceny ze słownika (`d.marketing.pricing`), bo tam stoją razem
 * z opisem planu i odmieniają się po polsku. Tutaj mieszkają te same kwoty
 * liczbowo, bo panel administratora sumuje przychód, a suma napisów „39 zł"
 * nie istnieje. Zgodności obu list pilnuje test w `__tests__/plans.test.ts`.
 *
 * Osobne kwoty per wersja krajowa, a nie przelicznik: cennik brytyjski jest
 * ustalony w funtach, a nie wyliczony z polskiego po kursie dnia.
 */
export const PLAN_PRICE: Record<Locale, Record<SubscriptionPlan, number>> = {
  pl: { FREE: 0, START: 3900, PRO: 9900, PORTFOLIO: 24900 },
  uk: { FREE: 0, START: 900, PRO: 2400, PORTFOLIO: 5900 },
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


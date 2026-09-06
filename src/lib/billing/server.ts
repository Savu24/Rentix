import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { planAllows, planFeatures, type PlanFeature } from "./features";
import { DEFAULT_PLAN, planUsage, type PlanUsage } from "./plans";

/**
 * Odczyt planu z bazy.
 *
 * Osobno od `plans.ts` z tego samego powodu, co `i18n/server.ts` od
 * `i18n/config.ts`: tamten plik nie dotyka Prismy, więc czyta go i test,
 * i przeglądarka. Tutaj mieszka wszystko, co wymaga zapytania.
 */

/**
 * Umowy wliczane do limitu: wszystko, czego nie ma w archiwum.
 *
 * Status nie ma znaczenia. Szkic i rezerwacja też zajmują miejsce w portfelu,
 * a liczenie samych aktywnych dawałoby obejście: sto umów w szkicu, dokumenty
 * wystawiane ręcznie. Archiwum jest wolne, bo to zamknięta historia — i to ono
 * jest drogą wyjścia dla konta, które dobiło do progu.
 */
export function countLeases(organizationId: string): Promise<number> {
  return prisma.lease.count({ where: { organizationId, archivedAt: null } });
}

/**
 * Plan i zużycie konta.
 *
 * `cache` z Reacta zwija to do jednego kompletu zapytań na żądanie, tak samo
 * jak przy `organizationLocale` — pyta o to i pasek boczny, i strona ustawień,
 * i serwis umów przy zapisie.
 *
 * Konto bez wiersza subskrypcji dostaje plan darmowy z domyślnym progiem.
 * Taki wiersz zakłada dziś rejestracja, ale panel nie może paść przez jego brak.
 */
export const organizationPlan = cache(async (organizationId: string): Promise<PlanUsage> => {
  const [subscription, used] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId },
      select: { plan: true, leaseLimit: true },
    }),
    countLeases(organizationId),
  ]);

  return planUsage(subscription?.plan ?? DEFAULT_PLAN, subscription?.leaseLimit, used);
});

/**
 * Czy konto ma dostęp do funkcji bramkowanej planem.
 *
 * Idzie przez `organizationPlan`, więc korzysta z tego samego `cache` — strona
 * i endpoint pytają o plan raz na żądanie, choćby sprawdzały trzy funkcje.
 */
export async function organizationAllows(
  organizationId: string,
  feature: PlanFeature,
): Promise<boolean> {
  const { plan } = await organizationPlan(organizationId);
  return planAllows(plan, feature);
}

/**
 * Wszystkie funkcje, które konto ma w swoim planie.
 *
 * Panel potrzebuje całego zestawu naraz, a nie odpowiedzi na jedno pytanie:
 * pasek boczny, zakładki ustawień i przyciski w formularzach rysują kłódkę
 * u siebie, a każdy z nich siedzi po stronie przeglądarki. Zestaw wchodzi tam
 * raz, przez `PlanFeaturesProvider` z layoutu panelu, zamiast siedmiu
 * osobnych propsów przepychanych przez kilkanaście komponentów.
 */
export async function organizationFeatures(organizationId: string): Promise<PlanFeature[]> {
  const { plan } = await organizationPlan(organizationId);
  return planFeatures(plan);
}

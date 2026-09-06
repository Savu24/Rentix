import type { SubscriptionPlan } from "@/generated/prisma/enums";

/**
 * Funkcje wchodzące dopiero od któregoś progu.
 *
 * Do tej pory plany różniły się wyłącznie liczbą umów, a cennik obiecywał
 * przy wyższych progach rzeczy, których nie było w kodzie. Ten plik jest
 * jedynym miejscem, w którym zapisano, od którego progu wchodzą — czyta go
 * i API (żeby obietnica była egzekwowana), i panel (żeby zamiast przycisku
 * prowadzącego w błąd 403 pokazać kłódkę).
 *
 * Czysta mapa, bez Prismy: plan konta czyta `organizationPlan()` z `./server`,
 * a decyzja da się sprawdzić testem bez bazy — tak samo jak przy `planUsage`.
 */

/** Rosnąco, od najniższego progu. Kolejność jest treścią, nie kosmetyką. */
export const PLAN_ORDER: readonly SubscriptionPlan[] = ["FREE", "START", "PRO", "PORTFOLIO"];

/**
 * Funkcje bramkowane planem.
 *
 * Lista pokrywa wszystko, co cennik obiecuje przy progach wyższych niż Free,
 * z jednym wyjątkiem: „konta właścicieli" przy planie Portfel. Ta sekcja
 * działa dziś na każdym koncie i jest częścią codziennej pracy z
 * nieruchomością, więc jej odebranie to osobna decyzja produktowa, a nie
 * skutek uboczny domykania bramek.
 */
export type PlanFeature =
  /** Logo wynajmującego drukowane na dokumentach. */
  | "DOCUMENT_LOGO"
  /** Wysyłka dokumentu do najemcy mailem na żądanie. */
  | "EMAIL_DELIVERY"
  /** Zestawienie roczne: przychody, koszty i ściągalność za rok. */
  | "ANNUAL_REPORT"
  /** Własne teksty wiadomości do najemcy zamiast domyślnych. */
  | "MESSAGE_TEMPLATES"
  /** Wielu użytkowników w organizacji — zespół i zaproszenia. */
  | "TEAM"
  /** Eksport księgowy: rejestr dokumentów, wpłat i kosztów za okres. */
  | "ACCOUNTING_EXPORT"
  /** Portal najemcy — konto najemcy z wglądem we własne rozliczenia. */
  | "TENANT_PORTAL";

/** Od którego progu funkcja jest dostępna. */
export const FEATURE_MIN_PLAN: Record<PlanFeature, SubscriptionPlan> = {
  DOCUMENT_LOGO: "START",
  EMAIL_DELIVERY: "START",
  ANNUAL_REPORT: "START",
  MESSAGE_TEMPLATES: "PRO",
  TEAM: "PRO",
  ACCOUNTING_EXPORT: "PRO",
  TENANT_PORTAL: "PRO",
};

/** Wszystkie funkcje bramkowane planem — do wyliczenia zestawu dla konta. */
export const PLAN_FEATURES = Object.keys(FEATURE_MIN_PLAN) as PlanFeature[];

/** Pozycja progu w kolejności. -1 dla wartości spoza listy — patrz `planAllows`. */
function rank(plan: SubscriptionPlan): number {
  return PLAN_ORDER.indexOf(plan);
}

/**
 * Czy konto na tym planie ma dostęp do funkcji.
 *
 * Plan spoza `PLAN_ORDER` (nowy próg dołożony do enuma, a zapomniany tutaj)
 * dostaje odmowę zamiast przypadkowego przejścia: brak wpisu ma się objawić
 * zablokowaną funkcją i zgłoszeniem, a nie cichym otwarciem wszystkiego.
 */
export function planAllows(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  const current = rank(plan);
  return current >= 0 && current >= rank(FEATURE_MIN_PLAN[feature]);
}

/** Zestaw funkcji dostępnych na danym progu — czyta go panel przez kontekst. */
export function planFeatures(plan: SubscriptionPlan): PlanFeature[] {
  return PLAN_FEATURES.filter((feature) => planAllows(plan, feature));
}

/** Najniższy plan, na którym funkcja działa — do komunikatu „dostępne od…". */
export function requiredPlan(feature: PlanFeature): SubscriptionPlan {
  return FEATURE_MIN_PLAN[feature];
}

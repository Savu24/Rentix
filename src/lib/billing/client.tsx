"use client";

import { createContext, useContext, useMemo } from "react";

import type { PlanFeature } from "./features";

/**
 * Zestaw funkcji konta dla komponentów klienckich.
 *
 * Kłódkę rysuje ten komponent, który zna przycisk: pasek boczny przy
 * „Raportach", zakładka ustawień przy „Wiadomościach", formularz dokumentu
 * przy polu „wyślij mailem". Wszystkie siedzą po stronie przeglądarki i żaden
 * nie może zapytać bazy, więc zestaw wchodzi raz — z layoutu panelu, tak samo
 * jak słownik przez `I18nProvider`.
 *
 * To jest wyłącznie warstwa widoku. Bramka, która coś naprawdę blokuje, stoi
 * w API (`requireApiFeature`) — ukryty przycisk nie jest zabezpieczeniem.
 */

type PlanFeaturesValue = {
  /** Czy konto ma funkcję w swoim planie. */
  allows: (feature: PlanFeature) => boolean;
};

const PlanFeaturesContext = createContext<PlanFeaturesValue | null>(null);

export function PlanFeaturesProvider({
  features,
  children,
}: {
  features: PlanFeature[];
  children: React.ReactNode;
}) {
  const value = useMemo<PlanFeaturesValue>(() => {
    const allowed = new Set(features);
    return { allows: (feature) => allowed.has(feature) };
  }, [features]);

  return <PlanFeaturesContext.Provider value={value}>{children}</PlanFeaturesContext.Provider>;
}

/**
 * Poza providerem zwraca „wszystko zablokowane", a nie rzuca.
 *
 * Odwrotnie niż `useI18n`, i z odwrotnego powodu: brakujący słownik daje
 * stronę bez napisów, którą widać od razu, a brakujący zestaw funkcji dałby
 * ciche otwarcie wszystkich kłódek — czyli dokładnie ten błąd, którego ten
 * plik ma pilnować. Fałszywa kłódka jest widoczna i naprawialna; fałszywe
 * przejście nie jest.
 */
export function usePlanFeatures(): PlanFeaturesValue {
  return useContext(PlanFeaturesContext) ?? { allows: () => false };
}

/** Skrót na jedną funkcję — najczęstszy przypadek. */
export function usePlanAllows(feature: PlanFeature): boolean {
  return usePlanFeatures().allows(feature);
}

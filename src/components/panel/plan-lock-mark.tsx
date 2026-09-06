"use client";

import { Lock } from "lucide-react";

import { requiredPlan, type PlanFeature } from "@/lib/billing/features";
import { usePlanAllows } from "@/lib/billing/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * Kłódka przy pozycji nawigacji, której konto nie ma w planie.
 *
 * Sama pozycja zostaje klikalna. Kłódka mówi „to tu jest, ale jeszcze nie
 * dla Ciebie", a strona pod spodem tłumaczy, co tam jest i od którego progu —
 * zablokowany link zostawiałby to samo pytanie bez odpowiedzi, a ukryta
 * pozycja nie zostawiałaby nawet pytania.
 *
 * Nic nie rysuje, gdy konto funkcję ma — dzięki temu wołający nie musi
 * powtarzać u siebie warunku.
 */
export function PlanLockMark({
  feature,
  className,
}: {
  feature: PlanFeature;
  className?: string;
}) {
  const { d } = useI18n();
  const allowed = usePlanAllows(feature);

  if (allowed) return null;

  const label = fill(d.panel.shell.lockedHint, {
    plan: d.panel.shell.planNames[requiredPlan(feature)],
  });

  return (
    <Lock
      className={cn("h-3.5 w-3.5 shrink-0 text-muted", className)}
      /*
        `aria-label` na ikonie, nie `aria-hidden`: to jedyny nośnik informacji
        „ta pozycja jest zablokowana" dla czytnika ekranu — nazwa zakładki
        obok mówi tylko, dokąd prowadzi.
      */
      role="img"
      aria-label={label}
    >
      {/* Podpowiedź pod myszą; czytnik ekranu przeczyta `aria-label` wyżej. */}
      <title>{label}</title>
    </Lock>
  );
}

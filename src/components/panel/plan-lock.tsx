import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requiredPlan, type PlanFeature } from "@/lib/billing/features";
import { panelDictionary } from "@/lib/panel/dictionary";

/**
 * Miejsce funkcji, której konto nie ma w planie.
 *
 * Karta zamiast ukrytej sekcji: jeśli cennik coś obiecuje przy wyższym progu,
 * to w panelu musi być widać, gdzie ta rzecz siedzi i czego wymaga. Ukrycie
 * bez śladu zostawia użytkownika z pytaniem, czy funkcji nie ma, czy jej nie
 * znalazł.
 *
 * Bez przycisku zakupu — płatności jeszcze nie ma, a przycisk prowadzący
 * donikąd jest gorszy niż jego brak (ta sama zasada, co w `PlanCard`).
 */
export async function PlanLock({
  feature,
  title,
  lead,
}: {
  feature: PlanFeature;
  title: string;
  lead: string;
}) {
  const d = await panelDictionary();

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt">
            <Lock className="h-4 w-4 text-muted" aria-hidden />
          </span>
          <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
          <Badge tone="accent">{d.panel.shell.plans[requiredPlan(feature)]}</Badge>
        </div>

        <p className="text-sm text-muted">{lead}</p>
      </CardContent>
    </Card>
  );
}

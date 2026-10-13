import { Lock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requiredPlan, type PlanFeature } from "@/lib/billing/features";
import { panelDictionary } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

/**
 * Miejsce funkcji, której konto nie ma w planie (redesign/18-raporty-zablokowane.svg).
 *
 * Karta zamiast ukrytej sekcji: jeśli cennik coś obiecuje przy wyższym progu,
 * to w panelu musi być widać, gdzie ta rzecz siedzi i od którego planu.
 * Ukrycie bez śladu zostawia użytkownika z pytaniem, czy funkcji nie ma,
 * czy jej nie znalazł. Bez zdania opisu — nazwa i plakietka planu wystarczą.
 *
 * Przycisk prowadzi do karty planu w ustawieniach konta, a nie do zakupu:
 * płatności jeszcze nie ma, a przycisk „kup" prowadzący donikąd jest gorszy
 * niż jego brak (ta sama zasada, co w `PlanCard`).
 *
 * `variant="overlay"` — duża karta na rozmytym podglądzie zablokowanego ekranu.
 */
export async function PlanLock({
  feature,
  title,
  variant = "row",
  children,
}: {
  feature: PlanFeature;
  title: string;
  variant?: "row" | "overlay";
  /** Podgląd ekranu pod kartą (tylko `overlay`) — rysowany wyblakły i nieklikalny. */
  children?: React.ReactNode;
}) {
  const d = await panelDictionary();
  const plan = d.panel.shell.plans[requiredPlan(feature)];
  const seePlans = (
    <Button asChild variant={variant === "overlay" ? "primary" : "secondary"}>
      <Link href="/panel/ustawienia#plan">{d.panel.panelMisc.seePlans}</Link>
    </Button>
  );

  if (variant === "overlay") {
    return (
      <div className="relative">
        {children ? (
          <div className="pointer-events-none opacity-35 select-none" aria-hidden inert>
            {children}
          </div>
        ) : null}
        <div className={cn("flex justify-center", children && "absolute inset-x-0 top-16 px-4")}>
          <section className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-[18px] bg-surface px-6 py-8 text-center shadow-float">
            <span className="flex size-14 items-center justify-center rounded-tile bg-highlight-soft">
              <Lock className="size-7 text-warn" strokeWidth={1.7} aria-hidden />
            </span>
            <h2 className="r-display text-xl leading-7 text-fg">{title}</h2>
            <Badge tone="amber" icon={Lock}>
              {plan}
            </Badge>
            {seePlans}
          </section>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-tile border border-border bg-surface px-5 py-5 lg:px-6">
      <Lock className="size-[18px] shrink-0 text-warn" aria-hidden />
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      <Badge tone="amber" icon={Lock}>
        {plan}
      </Badge>
      <div className="ml-auto">{seePlans}</div>
    </section>
  );
}

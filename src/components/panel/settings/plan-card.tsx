import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PLAN_LEASE_LIMIT, type PlanUsage } from "@/lib/billing/plans";
import { fill, pluralize } from "@/lib/i18n/format";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

import type { SubscriptionPlan } from "@/generated/prisma/enums";

/**
 * Plan konta i zużyty limit umów.
 *
 * Bez przycisku zakupu — płatności jeszcze nie ma, a przycisk prowadzący
 * donikąd jest gorszy niż jego brak. Zostaje sama informacja: ile umów wchodzi
 * w plan, ile już jest i co dają wyższe progi.
 *
 * Kolejność progów bierzemy z `PLAN_LEASE_LIMIT`, a nie z osobnej listy
 * w słowniku: cennik i limit egzekwowany przez API mają wychodzić z jednego
 * miejsca, inaczej rozjadą się przy pierwszej zmianie ceny.
 */
export async function PlanCard({ usage }: { usage: PlanUsage }) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.settings.plan;
  const names = d.panel.shell.plans;

  const noun = (count: number) => pluralize(locale, count, t.noun);

  // Próg wyższy niż domyślny dla planu = konto sprzed cennika albo ustalenie
  // indywidualne. Mówimy o tym wprost, żeby liczba nie wyglądała na pomyłkę.
  const planDefault = PLAN_LEASE_LIMIT[usage.plan];
  const raised = usage.limit !== null && planDefault !== null && usage.limit > planDefault;

  const filled =
    usage.limit === null ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <Badge tone="accent">{names[usage.plan]}</Badge>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg">
            {usage.limit === null
              ? fill(t.usageUnlimited, { used: usage.used, noun: noun(usage.used) })
              : fill(t.usage, {
                  used: usage.used,
                  limit: usage.limit,
                  noun: noun(usage.limit),
                })}
          </p>

          {usage.limit === null ? null : (
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt"
              role="presentation"
            >
              <div
                className={`h-full rounded-full ${usage.hasCapacity ? "bg-accent" : "bg-bad"}`}
                style={{ width: `${filled}%` }}
              />
            </div>
          )}

          {raised ? <p className="text-xs text-muted">{t.grandfathered}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-fg">{t.tiers}</p>
          <p className="text-xs text-muted">{t.sameFeatures}</p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(PLAN_LEASE_LIMIT) as SubscriptionPlan[]).map((plan) => {
              const limit = PLAN_LEASE_LIMIT[plan];
              const current = plan === usage.plan;

              return (
                <li
                  key={plan}
                  className={`flex items-baseline justify-between gap-3 text-sm ${
                    current ? "font-medium text-fg" : "text-muted"
                  }`}
                >
                  <span>
                    {names[plan]}
                    {current ? <span className="ml-2 text-xs text-accent">{t.current}</span> : null}
                  </span>
                  <span className="tabular font-mono text-[13px]">
                    {limit === null
                      ? t.tierUnlimited
                      : fill(t.tierLimit, { limit, noun: noun(limit) })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-muted">{t.note}</p>
      </CardContent>
    </Card>
  );
}

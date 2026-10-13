import { InfoTip } from "@/components/ui/info-tip";
import { PLAN_LEASE_LIMIT, type PlanUsage } from "@/lib/billing/plans";
import { fill, pluralize } from "@/lib/i18n/format";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

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
  const names = d.panel.shell.planNames;

  const noun = (count: number) => pluralize(locale, count, t.noun);

  // Próg wyższy niż domyślny dla planu = konto sprzed cennika albo ustalenie
  // indywidualne. Mówimy o tym wprost, żeby liczba nie wyglądała na pomyłkę.
  const planDefault = PLAN_LEASE_LIMIT[usage.plan];
  const raised = usage.limit !== null && planDefault !== null && usage.limit > planDefault;

  const filled =
    usage.limit === null ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <section id="plan" className="flex scroll-mt-10 flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-1.5 text-sm font-[550] text-muted">
          {t.title}
          <InfoTip label={t.planInfo} align="end">
            {t.note}
          </InfoTip>
        </h2>
        <p className="r-display text-[30px] leading-9 text-fg">{names[usage.plan]}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-muted">{d.panel.nav.leases}</span>
          <span className="font-mono text-sm font-semibold text-fg">
            {usage.limit === null
              ? fill(t.usageUnlimited, { used: usage.used, noun: noun(usage.used) })
              : fill(t.usage, { used: usage.used, limit: usage.limit, noun: noun(usage.limit) })}
          </span>
        </div>
        {usage.limit === null ? null : (
          <span className="block h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
            <span
              className={cn("block h-full rounded-full", usage.hasCapacity ? "bg-accent" : "bg-bad")}
              style={{ width: `${filled}%` }}
            />
          </span>
        )}
        {raised ? <p className="text-[12.5px] text-muted">{t.grandfathered}</p> : null}
      </div>

      <ul className="grid grid-cols-4 gap-2 border-t border-border pt-4">
        {(Object.keys(PLAN_LEASE_LIMIT) as SubscriptionPlan[]).map((plan) => {
          const limit = PLAN_LEASE_LIMIT[plan];
          const current = plan === usage.plan;

          return (
            <li key={plan} className="flex min-w-0 flex-col gap-1">
              <span className={cn("text-[13px]", current ? "font-[650] text-accent" : "font-medium text-muted")}>
                {names[plan]}
                {current ? <span className="sr-only"> ({t.current})</span> : null}
              </span>
              <span className="font-mono text-[13px] text-subtle">
                {limit === null ? "∞" : limit}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import { useState } from "react";

import {
  CALCULATOR_DEFAULT_LEASES,
  CALCULATOR_MAX_LEASES,
  CALCULATOR_RENT,
  estimatePlan,
} from "@/lib/billing/calculator";
import { PLAN_ORDER } from "@/lib/billing/features";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";
import { chargesRentFee, RENT_FEE_THRESHOLD_GROSZE } from "@/lib/billing/plans";
import { formatMoney, formatMoneyWhole } from "@/lib/money";

/** „41 zł” przy pełnych złotych, „41,50 zł”, gdy są grosze — jak na kartach cennika. */
function money(grosze: number, locale: Locale): string {
  return grosze % 100 === 0 ? formatMoneyWhole(grosze, locale) : formatMoney(grosze, locale);
}

type Pricing = Dictionary["marketing"]["pricing"];

type Props = {
  locale: Locale;
  t: Pricing["calculator"];
  /** Karty planów w kolejności `PLAN_ORDER` — kalkulator pokazuje ich treść. */
  plans: Pricing["plans"];
};

/**
 * Kalkulator przy cenniku: dwa suwaki i odpowiedź.
 *
 * Kwotę i nazwę planu bierzemy z tych samych kart, które stoją wyżej — gdyby
 * kalkulator formatował cenę po swojemu, na jednej stronie stałoby „99 zł"
 * i „99,00 zł", a przy najbliższej podwyżce jedno z dwóch by się nie zmieniło.
 * Kolejność kart odpowiada `PLAN_ORDER`; pilnuje tego test cennika.
 *
 * Pokazujemy też **udział abonamentu w czynszu**, bo to jedyna liczba, która
 * mówi wprost, ile ten cennik kosztuje przy rosnącym portfelu: cena stoi
 * w miejscu, więc procent spada z każdą kolejną umową.
 */
export function PlanCalculator({ locale, t, plans }: Props) {
  const rentRange = CALCULATOR_RENT[locale];
  const [leases, setLeases] = useState(CALCULATOR_DEFAULT_LEASES);
  const [rent, setRent] = useState(rentRange.default);

  const estimate = estimatePlan(leases, rent, locale);
  const card = plans[PLAN_ORDER.indexOf(estimate.plan)] ?? plans[0]!;

  /*
    Udział podajemy z dwoma miejscami, ale bez wymuszania ich na okrągłych
    wartościach: „0,13%" i „0%", nie „0,00%". Formater budujemy przy każdym
    renderze świadomie — jest jeden na stronę, a nie jeden na wiersz listy.
  */
  const share =
    estimate.shareOfRent === null
      ? null
      : new Intl.NumberFormat(LOCALE_META[locale].intl, {
          style: "percent",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(estimate.shareOfRent);

  /*
    Zdanie pod kwotą. Tam, gdzie doliczamy opłatę od czynszu, mówi o progu —
    to jest reguła, którą klient musi znać. W pozostałych wersjach zostaje
    udział abonamentu w czynszu: cena stoi w miejscu, więc procent spada
    z każdą kolejną umową.
  */
  function punchline(): string {
    if (estimate.priceGrosze === 0) return t.shareFree;

    if (chargesRentFee(locale)) {
      const threshold = formatMoneyWhole(RENT_FEE_THRESHOLD_GROSZE, locale);
      return fill(estimate.rentFeeGrosze > 0 ? t.feeRule : t.feeNone, { threshold });
    }

    return share === null ? t.shareFree : fill(t.share, { percent: share });
  }

  return (
    <section className="mt-8 grid grid-cols-1 gap-8 rounded-tile border border-border bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center lg:gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-semibold text-fg">{t.heading}</h3>
          <p className="mt-1 text-[13.5px] text-muted">{t.lead}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="calc-leases" className="text-[13.5px] text-muted">
                {t.leases}
              </label>
              <span className="font-mono text-[15px] font-semibold text-fg">
                {leases}
                {leases === CALCULATOR_MAX_LEASES ? "+" : ""}
              </span>
            </div>
            <input
              id="calc-leases"
              className="r-range mt-3"
              type="range"
              min={1}
              max={CALCULATOR_MAX_LEASES}
              step={1}
              value={leases}
              onChange={(event) => setLeases(Number(event.target.value))}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="calc-rent" className="text-[13.5px] text-muted">
                {t.rent}
              </label>
              <span className="font-mono text-[15px] font-semibold whitespace-nowrap text-fg">
                {formatMoneyWhole(rent, locale)}
              </span>
            </div>
            <input
              id="calc-rent"
              className="r-range mt-3"
              type="range"
              min={rentRange.min}
              max={rentRange.max}
              step={rentRange.step}
              value={rent}
              onChange={(event) => setRent(Number(event.target.value))}
            />
          </div>
        </div>

        <p className="text-[13px] text-subtle">
          {fill(t.rentRoll, { amount: formatMoneyWhole(estimate.rentRollGrosze, locale) })}
        </p>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8" aria-live="polite">
        <p className="text-sm font-semibold text-accent">
          {t.plan}: {card.name}
        </p>
        {/* Ponad próg czynszu duża liczba to suma do zapłaty, a nie sama
            cena planu — klient ma zobaczyć kwotę, która zejdzie z karty. */}
        <p className="r-display mt-2 text-[38px] leading-none tracking-[-0.8px] text-fg">
          {estimate.rentFeeGrosze > 0 ? money(estimate.totalGrosze, locale) : card.price}
          <span className="font-sans text-[14px] font-medium tracking-normal text-muted">{card.period}</span>
        </p>
        <p className="mt-1 text-[13.5px] text-muted">{card.note}</p>
        {estimate.rentFeeGrosze > 0 ? (
          <p className="mt-1 text-[13.5px] text-muted">
            {fill(t.feeBreakdown, {
              plan: card.price,
              fee: money(estimate.rentFeeGrosze, locale),
            })}
          </p>
        ) : null}
        <p className="mt-3 text-[13.5px] text-muted">{punchline()}</p>
        {t.priceNote ? <p className="mt-1 text-[12.5px] text-subtle">{t.priceNote}</p> : null}
      </div>
    </section>
  );
}

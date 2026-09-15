"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
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
import { formatMoneyWhole } from "@/lib/money";

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

  return (
    <Card className="mx-auto mt-7 max-w-[1100px]">
      <CardContent className="grid gap-8 p-[26px] sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="flex flex-col gap-7">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">{t.heading}</h3>
            <p className="mt-1 text-[13.5px] text-muted">{t.lead}</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="calc-leases" className="text-[13.5px] font-medium text-fg">
                {t.leases}
              </label>
              <span className="tabular r-display text-[19px] text-fg">
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
              <label htmlFor="calc-rent" className="text-[13.5px] font-medium text-fg">
                {t.rent}
              </label>
              <span className="tabular r-display text-[19px] text-fg">
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

          <p className="text-[13px] text-muted">
            {fill(t.rentRoll, { amount: formatMoneyWhole(estimate.rentRollGrosze, locale) })}
          </p>
        </div>

        <div className="rounded-[16px] bg-mint px-6 py-8 text-center">
          <p className="text-[13px] text-fg/60">{t.plan}</p>
          <p className="r-display mt-1 text-[26px] text-fg">{card.name}</p>

          <p className="r-display mt-4 text-[38px] leading-none text-fg">
            {card.price}
            <span className="font-sans text-[15px] font-medium text-fg/60">{card.period}</span>
          </p>
          <p className="mt-1.5 text-[13.5px] text-fg/70">{card.note}</p>

          {/* Zdanie o udziale to puenta kalkulatora, więc dostaje własną
              kreskę — ma się czytać jako wniosek, a nie kolejny wiersz. */}
          <p className="mt-5 border-t border-fg/10 pt-5 text-[13.5px] text-fg/80">
            {estimate.priceGrosze === 0 || share === null
              ? t.shareFree
              : fill(t.share, { percent: share })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

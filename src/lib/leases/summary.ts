import type { UtilitiesMode } from "@/generated/prisma/enums";
import {
  buildBillingPeriod,
  prorateRent,
  shouldBillPeriod,
  type BillingLease,
  type BillingPeriod,
} from "@/lib/leases/billing";
import { daysUntilLeaseEnd } from "@/lib/leases/expiry";
import { sumGrosze } from "@/lib/money";

/*
  Podsumowanie umowy do pokazania obok formularza i na karcie umowy
  (redesign/11-umowa-karta-*.svg, 12-umowa-formularz.svg). Liczy tymi samymi
  funkcjami co naliczanie w cronie — podsumowanie, które rozjechałoby się
  z pierwszym rachunkiem, byłoby gorsze niż żadne.
*/

/** Czy tryb rozliczenia mediów dokłada stałą zaliczkę do rachunku. */
export function chargesUtilitiesAdvance(mode: UtilitiesMode): boolean {
  return mode === "FLAT_RATE" || mode === "MIXED";
}

export type LeaseMonthlySummary = {
  rentGrosze: number;
  /** Zaliczka na media, która faktycznie trafia na rachunek (0 w innych trybach). */
  utilitiesGrosze: number;
  totalGrosze: number;
  /** Udział czynszu w całości, w procentach — do paska rozbicia. */
  rentPercent: number;
};

export function leaseMonthlySummary(lease: {
  rentGrosze: number;
  utilitiesMode: UtilitiesMode;
  utilitiesAdvanceGrosze: number;
}): LeaseMonthlySummary {
  const utilitiesGrosze = chargesUtilitiesAdvance(lease.utilitiesMode)
    ? Math.max(0, lease.utilitiesAdvanceGrosze)
    : 0;
  const totalGrosze = sumGrosze([lease.rentGrosze, utilitiesGrosze]);

  return {
    rentGrosze: lease.rentGrosze,
    utilitiesGrosze,
    totalGrosze,
    rentPercent: totalGrosze > 0 ? Math.round((lease.rentGrosze / totalGrosze) * 1000) / 10 : 100,
  };
}

export type FirstBilling = {
  period: BillingPeriod;
  /** Kwota pierwszego rachunku: czynsz i zaliczka, proporcjonalnie do dni. */
  amountGrosze: number;
  /** Pierwszy miesiąc jest niepełny i kwota jest proporcjonalna. */
  prorated: boolean;
};

/** Ile miesięcy do przodu szukamy pierwszego naliczenia przy „nie naliczaj przed". */
const SEARCH_MONTHS = 36;

/**
 * Pierwszy rachunek, jaki wystawi naliczanie dla tej umowy, albo `null`,
 * gdy w oknie wyszukiwania nie ma żadnego okresu do naliczenia.
 *
 * Uwzględnia `billingStartsAt`: przy umowie przejętej z innego programu
 * pierwszy rachunek przypada na pierwszy okres od tej daty, a nie na
 * miesiąc zawarcia umowy.
 */
export function firstBilling(
  lease: BillingLease & { billingStartsAt?: Date | null },
): FirstBilling | null {
  const startYear = lease.startDate.getUTCFullYear();
  const startMonth = lease.startDate.getUTCMonth();

  for (let offset = 0; offset < SEARCH_MONTHS; offset++) {
    const year = startYear + Math.floor((startMonth + offset) / 12);
    const month = (startMonth + offset) % 12;
    const period = buildBillingPeriod(lease, year, month);
    if (!period) return null;
    if (!shouldBillPeriod(period, lease.billingStartsAt)) continue;

    const charges = chargesUtilitiesAdvance(lease.utilitiesMode)
      ? prorateRent(Math.max(0, lease.utilitiesAdvanceGrosze), period)
      : 0;

    return {
      period,
      amountGrosze: sumGrosze([prorateRent(lease.rentGrosze, period), charges]),
      prorated: period.coveredDays < period.totalDays,
    };
  }

  return null;
}

export type LeasePeriodProgress = {
  /** Ile okresu upłynęło, 0-100. */
  percent: number;
  /** Dni do końca; 0 = kończy się dziś, ujemne = już się skończyła. */
  daysLeft: number;
};

/** Postęp umowy terminowej; `null` dla bezterminowej — nie ma czego mierzyć. */
export function leasePeriodProgress(
  startDate: Date,
  endDate: Date | null,
  now: Date,
): LeasePeriodProgress | null {
  if (!endDate) return null;

  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 100;

  return { percent, daysLeft: daysUntilLeaseEnd(endDate, now) };
}

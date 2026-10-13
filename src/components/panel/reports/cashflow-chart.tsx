"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { useI18n } from "@/lib/i18n/client";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";

/**
 * Przychód i koszty miesiąc po miesiącu.
 *
 * Słupki obok siebie, nie skumulowane: pytanie brzmi „ile weszło, ile wyszło",
 * a stos pokazywałby sumę obu, która nic nie znaczy. Jedna oś Y dla obu serii —
 * druga oś pozwoliłaby narysować dowolną relację między nimi.
 *
 * Kolory idą z tokenów `--chart-1` i `--chart-2`, więc wykres sam przełącza się
 * z motywem. Paleta jest przewalidowana pod daltonizm — patrz
 * docs/chart-palette.md.
 */
export type CashflowPoint = {
  month: number;
  incomeGrosze: number;
  expenseGrosze: number;
  profitGrosze: number;
};

/** Grosze/pensy na jednostki główne — Recharts rysuje liczby, nie kwoty. */
const minorToMajor = (minor: number) => minor / 100;

/**
 * Skrót miesiąca w języku konta. Lista w kodzie była polska, a oś wykresu
 * czyta się razem z resztą panelu.
 */
function monthLabel(month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: "short" }).format(
    new Date(Date.UTC(2026, month, 1)),
  );
}

/**
 * Podpowiedź z przychodem, kosztami i wynikiem miesiąca (ciemny dymek z projektu).
 *
 * Wynik nie jest trzecim słupkiem: to różnica dwóch pozostałych, więc na
 * wykresie tylko dublowałby informację, a w podpowiedzi odpowiada na pytanie,
 * po które i tak najeżdża się myszą. Liczy go raport (`monthlyBreakdown`).
 */
function CashflowTooltip({ active, payload, label }: TooltipContentProps) {
  const { d, locale } = useI18n();
  const t = d.panel.reportsPage;

  if (!active || !payload?.length) return null;

  const { profitGrosze } = payload[0].payload as { profitGrosze: number };

  return (
    <div className="rounded-alert bg-fg px-3.5 py-2.5 text-[12.5px] text-bg shadow-float">
      <p className="font-semibold">{label}</p>

      <ul className="mt-1.5 flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 opacity-80">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono">
              {typeof entry.value === "number"
                ? formatMoney(Math.round(entry.value * 100), locale)
                : d.panel.reportsPage.chartNoValue}
            </span>
          </li>
        ))}

        <li className="mt-0.5 flex items-center justify-between gap-6 border-t border-bg/20 pt-1.5">
          <span className="font-semibold">{t.profit}</span>
          <span className="font-mono font-semibold">
            {formatMoney(profitGrosze, locale)}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const { d, locale } = useI18n();
  const t = d.panel.reportsPage;

  /*
    Klucze serii są stałymi identyfikatorami, a nie napisami — widoczna nazwa
    idzie przez `name` na `<Bar>`. Wcześniej kluczem było polskie „Przychód",
    więc przetłumaczenie legendy rozsypywałoby wykres.
  */
  const points = data.map((row) => ({
    name: monthLabel(row.month, locale),
    income: minorToMajor(row.incomeGrosze),
    expense: minorToMajor(row.expenseGrosze),
    profitGrosze: row.profitGrosze,
  }));

  return (
    <div className="h-64 w-full lg:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--ink-3)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />
          <YAxis
            tick={{ fill: "var(--ink-3)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat(LOCALE_META[locale].intl, { notation: "compact" }).format(
                value,
              )
            }
          />
          <Tooltip content={CashflowTooltip} cursor={{ fill: "var(--hover)" }} />
          <Bar
            dataKey="income"
            name={t.income}
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expense"
            name={t.expenses}
            fill="var(--chart-2)"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

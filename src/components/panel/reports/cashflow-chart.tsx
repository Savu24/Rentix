"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
 * Podpowiedź z przychodem, kosztami i wynikiem miesiąca.
 *
 * Zysk liczymy tutaj, a nie rysujemy jako trzeci słupek: to różnica dwóch
 * pozostałych, więc na wykresie tylko dublowałby informację, a w podpowiedzi
 * odpowiada na pytanie, po które i tak najeżdża się myszą.
 */
function CashflowTooltip({ active, payload, label }: TooltipContentProps) {
  const { d, locale } = useI18n();
  const t = d.panel.reportsPage;

  if (!active || !payload?.length) return null;

  const point = payload[0].payload as { income: number; expense: number };
  const profitGrosze = Math.round((point.income - point.expense) * 100);

  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 text-[13px] shadow-sm">
      <p className="text-muted">{label}</p>

      <ul className="mt-1.5 flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="tabular font-mono text-fg">
              {typeof entry.value === "number"
                ? formatMoney(Math.round(entry.value * 100), locale)
                : d.panel.reportsPage.chartNoValue}
            </span>
          </li>
        ))}

        <li className="mt-0.5 flex items-center justify-between gap-6 border-t border-border pt-1.5">
          <span className="font-medium text-fg">{t.profit}</span>
          <span
            className={`tabular font-mono font-medium ${profitGrosze < 0 ? "text-bad" : "text-good"}`}
          >
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
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
          />
          <YAxis
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat(LOCALE_META[locale].intl, { notation: "compact" }).format(
                value,
              )
            }
          />
          <Tooltip content={CashflowTooltip} cursor={{ fill: "var(--surface-alt)" }} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }}
            iconType="circle"
          />
          <Bar
            dataKey="income"
            name={t.income}
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expense"
            name={t.expenses}
            fill="var(--chart-2)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

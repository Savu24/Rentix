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

import { formatPLN } from "@/lib/money";
import { MONTH_SHORT } from "@/lib/reports/aggregate";

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

const zloty = (grosze: number) => grosze / 100;

/**
 * Podpowiedź z przychodem, kosztami i wynikiem miesiąca.
 *
 * Zysk liczymy tutaj, a nie rysujemy jako trzeci słupek: to różnica dwóch
 * pozostałych, więc na wykresie tylko dublowałby informację, a w podpowiedzi
 * odpowiada na pytanie, po które i tak najeżdża się myszą.
 */
function CashflowTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as { Przychód: number; Koszty: number };
  const profitGrosze = Math.round((point.Przychód - point.Koszty) * 100);

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
              {typeof entry.value === "number" ? formatPLN(Math.round(entry.value * 100)) : "—"}
            </span>
          </li>
        ))}

        <li className="mt-0.5 flex items-center justify-between gap-6 border-t border-border pt-1.5">
          <span className="font-medium text-fg">Zysk</span>
          <span
            className={`tabular font-mono font-medium ${profitGrosze < 0 ? "text-bad" : "text-good"}`}
          >
            {formatPLN(profitGrosze)}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const points = data.map((row) => ({
    name: MONTH_SHORT[row.month],
    Przychód: zloty(row.incomeGrosze),
    Koszty: zloty(row.expenseGrosze),
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
              new Intl.NumberFormat("pl-PL", { notation: "compact" }).format(value)
            }
          />
          <Tooltip content={CashflowTooltip} cursor={{ fill: "var(--surface-alt)" }} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }}
            iconType="circle"
          />
          <Bar dataKey="Przychód" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Koszty" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

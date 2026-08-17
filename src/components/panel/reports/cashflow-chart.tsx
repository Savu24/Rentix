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
          <Tooltip
            // Recharts typuje wartość jako `ValueType | undefined`, bo tooltip
            // potrafi trafić na pustą serię — stąd zawężenie zamiast `number`.
            formatter={(value) =>
              typeof value === "number" ? formatPLN(Math.round(value * 100)) : "—"
            }
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
            cursor={{ fill: "var(--surface-alt)" }}
          />
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

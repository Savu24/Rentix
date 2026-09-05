"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";

import { ExpenseForm } from "@/components/panel/expenses/expense-form";
import { ExpenseRow } from "@/components/panel/expenses/expense-row";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpenseListItem } from "@/lib/expenses/service";
import { formatMoney } from "@/lib/money";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";

/**
 * Koszty jednej nieruchomości, na jej karcie.
 *
 * Osobne wejście od zestawienia w finansach, bo pytanie jest inne: tam
 * właściciel przepisuje wyciąg dla całego konta, tutaj patrzy na jeden lokal
 * i chce dopisać jego rachunek bez szukania go potem na wspólnej liście.
 */
export function PropertyExpenses({
  propertyId,
  expenses,
  /** Suma za cały okres — lista pokazuje tylko ostatnie pozycje. */
  totalGrosze,
  count,
}: {
  propertyId: string;
  expenses: ExpenseListItem[];
  totalGrosze: number;
  count: number;
}) {
  const { d, locale } = useI18n();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-baseline gap-2 text-[15px] font-semibold text-fg">
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted" aria-hidden />
            {d.panel.financePage.expensesTitle}
          </span>
          {count > 0 ? (
            <span className="text-sm font-normal text-muted">
              {fill(d.panel.panelMisc.expensesTotal, {
                amount: formatMoney(totalGrosze, locale),
              })}
            </span>
          ) : null}
        </h2>

        <ExpenseForm lockedPropertyId={propertyId} />
      </div>

      {expenses.length === 0 ? (
        <Card className="bg-surface-alt">
          <CardContent className="p-4">
            <p className="text-sm text-muted">
              {d.panel.panelMisc.propertyExpensesEmpty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col p-0">
            {expenses.map((expense, index) => (
              <div key={expense.id} className={index > 0 ? "border-t border-border" : ""}>
                <ExpenseRow expense={expense} showProperty={false} lockedPropertyId={propertyId} />
              </div>
            ))}

            {/* Karta nieruchomości pokazuje wycinek — pełna historia z filtrami
                i podziałem na lata stoi w finansach. */}
            {count > expenses.length ? (
              <div className="border-t border-border px-4 py-2.5">
                <Link
                  href={`/panel/finanse/koszty?propertyId=${propertyId}`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Zobacz wszystkie ({count})
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

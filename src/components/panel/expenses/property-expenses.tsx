"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";

import { ExpenseForm } from "@/components/panel/expenses/expense-form";
import { ExpenseRow } from "@/components/panel/expenses/expense-row";
import { SectionCard } from "@/components/panel/section-card";
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
  const misc = d.panel.panelMisc;

  return (
    <SectionCard
      title={d.panel.financePage.expensesTitle}
      icon={Wallet}
      actions={<ExpenseForm lockedPropertyId={propertyId} triggerVariant="secondary" />}
      bodyClassName="px-0 pt-2 pb-0 lg:px-0 lg:pb-0"
      footer={
        count > 0 ? (
          <>
            {/* Karta nieruchomości pokazuje wycinek — pełna historia z filtrami
                i podziałem na lata stoi w finansach. */}
            {count > expenses.length ? (
              <Link
                href={`/panel/finanse/koszty?propertyId=${propertyId}`}
                className="text-sm font-[550] text-accent hover:underline"
              >
                {fill(misc.seeAll, { count })}
              </Link>
            ) : (
              <span className="text-sm font-[550] text-muted">{misc.roomsSum}</span>
            )}
            <span className="font-mono text-[15px] font-[650] text-fg">
              {formatMoney(totalGrosze, locale)}
            </span>
          </>
        ) : undefined
      }
    >
      {expenses.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted lg:px-6">{misc.propertyExpensesEmpty}</p>
      ) : (
        <div className="flex flex-col">
          {expenses.map((expense) => (
            <div key={expense.id} className="border-t border-border first:border-t-0">
              <ExpenseRow expense={expense} showProperty={false} lockedPropertyId={propertyId} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

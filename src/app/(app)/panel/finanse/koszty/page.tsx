import { SearchX, Wallet, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ExpenseFilters } from "@/components/panel/expenses/expense-filters";
import { ExpenseForm } from "@/components/panel/expenses/expense-form";
import { ExpenseRow } from "@/components/panel/expenses/expense-row";
import { FinanceTabs } from "@/components/panel/finance-tabs";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { accrueRecurringExpenses } from "@/lib/expenses/recurrence";
import { expenseSummary, expenseYears, listExpenses } from "@/lib/expenses/service";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { expenseCategoryLabels, expenseListQuerySchema } from "@/lib/validations/expense";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.financePage.expensesTitle };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.financePage;
  const session = await requireOwnerSession("/panel/finanse/koszty");
  const organizationId = session.user.organizationId;
  const params = await searchParams;

  const parsed = expenseListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : expenseListQuerySchema.parse({});

  // Naliczenie przed odczytem, żeby zaległe pozycje weszły do tej samej listy
  // i tej samej sumy. Nocny cron robi to samo dla wszystkich kont — tutaj
  // chodzi o to, by właściciel nie oglądał stanu sprzed doliczenia.
  await accrueRecurringExpenses(organizationId);

  const [expenses, summary, years, properties] = await Promise.all([
    listExpenses(organizationId, query),
    expenseSummary(organizationId, query),
    expenseYears(organizationId),
    prisma.property.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filtered = Object.keys(params).length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader title={t.title} actions={<ExpenseForm properties={properties} />} />
        <FinanceTabs />
      </div>

      <div className="flex flex-col gap-3">
        <Suspense fallback={null}>
          <ExpenseFilters total={expenses.length} years={years} properties={properties} />
        </Suspense>

        {summary.count > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="flex items-baseline gap-2">
              <span className="text-[13.5px] text-muted">{t.expensesTotal}</span>
              <span className="font-mono text-[15px] font-[650] whitespace-nowrap text-fg">
                {formatMoney(summary.totalGrosze, locale)}
              </span>
            </p>
            {/* Trzy największe kategorie — pełne rozbicie jest w raportach,
                tutaj chodzi tylko o „na co to poszło". */}
            <div className="flex flex-wrap gap-1.5">
              {summary.byCategory.slice(0, 3).map((bucket) => (
                <Badge key={bucket.category} size="sm">
                  {expenseCategoryLabels(d)[bucket.category]}, {formatMoney(bucket.totalGrosze, locale)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {expenses.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t.expensesNoMatchTitle}
            action={
              <Button asChild variant="secondary">
                <Link href="/panel/finanse/koszty">
                  <X className="size-[18px]" aria-hidden />
                  {t.expenseFilters.clear}
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Wallet}
            title={t.expensesEmptyTitle}
            action={<ExpenseForm properties={properties} />}
          />
        )
      ) : (
        <div className="overflow-hidden rounded-tile border border-border bg-surface lg:rounded-card">
          <div className="hidden h-10 items-center gap-4 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted lg:flex">
            <span className="w-[88px] shrink-0">{t.expensesTable.date}</span>
            <span className="flex-1">{t.expensesTable.cost}</span>
            <span className="w-[200px] shrink-0">{t.expensesTable.property}</span>
            <span className="w-[150px] shrink-0" />
            <span className="w-[120px] shrink-0 text-right">{t.expensesTable.amount}</span>
            <span className="w-16 shrink-0" />
          </div>
          <ul>
            {expenses.map((expense) => (
              <li key={expense.id} className="border-t border-border first:border-t-0">
                <ExpenseRow expense={expense} properties={properties} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { Wallet } from "lucide-react";
import type { Metadata } from "next";

import { ExpenseFilters } from "@/components/panel/expenses/expense-filters";
import { ExpenseForm } from "@/components/panel/expenses/expense-form";
import { ExpenseRow } from "@/components/panel/expenses/expense-row";
import { FinanceTabs } from "@/components/panel/finance-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { accrueRecurringExpenses } from "@/lib/expenses/recurrence";
import { expenseSummary, expenseYears, listExpenses } from "@/lib/expenses/service";
import { formatPLN } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORY_LABEL, expenseListQuerySchema } from "@/lib/validations/expense";

export const metadata: Metadata = { title: "Koszty" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">Finanse</h1>
          <p className="text-sm text-muted">
            Wydatki właściciela — bez nich raport pokaże przychód, ale nie zysk.
          </p>
        </div>

        <ExpenseForm properties={properties} />
      </div>

      <FinanceTabs />

      {summary.count > 0 ? (
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-muted">Suma kosztów w widoku</p>
                <p className="tabular font-mono text-[19px] font-semibold text-fg">
                  {formatPLN(summary.totalGrosze)}
                </p>
              </div>

              {/* Trzy największe kategorie — pełne rozbicie jest w raportach,
                  tutaj chodzi tylko o „na co to poszło". */}
              <div className="flex flex-wrap gap-2">
                {summary.byCategory.slice(0, 3).map((bucket) => (
                  <Badge key={bucket.category}>
                    {EXPENSE_CATEGORY_LABEL[bucket.category]} · {formatPLN(bucket.totalGrosze)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ExpenseFilters total={expenses.length} years={years} properties={properties} />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={filtered ? "Żaden koszt nie pasuje do filtrów" : "Nie ma jeszcze kosztów"}
          description={
            filtered
              ? "Zmień kryteria albo wyczyść filtry."
              : "Wpisz czynsz do wspólnoty, ratę kredytu, remonty i ubezpieczenie. Dopiero wtedy raport policzy zysk, a nie sam przychód."
          }
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col p-0">
            {expenses.map((expense, index) => (
              <div key={expense.id} className={index > 0 ? "border-t border-border" : ""}>
                <ExpenseRow expense={expense} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

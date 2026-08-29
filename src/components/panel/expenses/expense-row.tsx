import { Repeat } from "lucide-react";

import { DeleteExpense } from "@/components/panel/expenses/delete-expense";
import { Badge } from "@/components/ui/badge";
import type { ExpenseListItem } from "@/lib/expenses/service";
import { formatPLN } from "@/lib/money";
import { describeRecurrence, EXPENSE_CATEGORY_LABEL } from "@/lib/validations/expense";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

/**
 * Wiersz listy kosztów.
 *
 * Wspólny dla zestawienia w finansach i dla karty nieruchomości — inaczej ta
 * sama pozycja wyglądałaby w dwóch miejscach inaczej, a znacznik cyklu
 * pojawiłby się tylko w jednym z nich.
 */
export function ExpenseRow({
  expense,
  /** Na karcie nieruchomości nazwa lokalu stoi w nagłówku, więc się powtarza. */
  showProperty = true,
}: {
  expense: ExpenseListItem;
  showProperty?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-fg">{expense.description}</p>
          {/* `whitespace-normal` znosi domyślne `nowrap` znacznika:
              „Podatek od nieruchomości" jest szersze niż kolumna
              opisu na telefonie i wychodziło poza wiersz. */}
          <Badge className="whitespace-normal text-left">
            {EXPENSE_CATEGORY_LABEL[expense.category]}
          </Badge>

          {/* Cykl widać tylko na wzorcu. Naliczone z niego pozycje są zwykłymi
              kosztami — powielony znacznik sugerowałby, że każda z nich nalicza
              coś dalej od siebie. */}
          {expense.recurrence ? (
            <Badge tone="accent" className="whitespace-normal text-left">
              <Repeat className="h-3 w-3" aria-hidden />
              {describeRecurrence(expense.recurrence, expense.recurrenceEveryDays)}
            </Badge>
          ) : null}
        </div>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>{dateFormat.format(expense.paidAt)}</span>
          {showProperty ? <span>{expense.property?.name ?? "koszt ogólny"}</span> : null}
          {expense.vendor ? <span>{expense.vendor}</span> : null}
          {expense.documentRef ? <span>{expense.documentRef}</span> : null}
          {expense.recurrence && expense.recurrenceNextAt ? (
            <span>następny {dateFormat.format(expense.recurrenceNextAt)}</span>
          ) : null}
          {expense.recurringFromId ? <span>naliczony automatycznie</span> : null}
        </p>
      </div>

      <p className="tabular font-mono text-sm text-fg">{formatPLN(expense.amountGrosze)}</p>

      <DeleteExpense expenseId={expense.id} />
    </div>
  );
}

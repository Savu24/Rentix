"use client";

import { Pencil, Repeat } from "lucide-react";
import { useState } from "react";

import { DeleteExpense } from "@/components/panel/expenses/delete-expense";
import {
  ExpenseForm,
  type ExpensePropertyOption,
} from "@/components/panel/expenses/expense-form";
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
 *
 * Edycja wchodzi w miejsce wiersza, a nie pod nim: poprawia się zwykle kwotę
 * albo datę tej jednej pozycji, więc formularz ma stać tam, gdzie przed chwilą
 * była liczba, a nie odsuwać resztę listy w dół.
 */
export function ExpenseRow({
  expense,
  /** Na karcie nieruchomości nazwa lokalu stoi w nagłówku, więc się powtarza. */
  showProperty = true,
  /** Lista do wyboru nieruchomości w edycji — patrz `ExpenseForm`. */
  properties = [],
  lockedPropertyId = null,
}: {
  expense: ExpenseListItem;
  showProperty?: boolean;
  properties?: ExpensePropertyOption[];
  lockedPropertyId?: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="p-3">
        <ExpenseForm
          expenseId={expense.id}
          properties={properties}
          lockedPropertyId={lockedPropertyId}
          onClose={() => setEditing(false)}
          defaultValues={{
            propertyId: expense.property?.id ?? "",
            category: expense.category,
            // Kwota wraca do formularza w złotówkach — w tej postaci ją
            // wpisano i tej samej oczekuje `moneyInput` przy zapisie.
            amountGrosze: (expense.amountGrosze / 100).toFixed(2),
            paidAt: expense.paidAt.toISOString().slice(0, 10),
            description: expense.description,
            vendor: expense.vendor ?? "",
            documentRef: expense.documentRef ?? "",
            notes: expense.notes ?? "",
            recurring: expense.recurrence !== null,
            // Wyłączony cykl zostawia w polu wartość domyślną: gdyby ktoś
            // zaznaczył checkbox, ma z czego wybierać, a do bazy i tak nic
            // z tego nie pójdzie, dopóki checkbox jest pusty.
            recurrence: expense.recurrence ?? "MONTHLY",
            recurrenceEveryDays: expense.recurrenceEveryDays ?? "",
          }}
        />
      </div>
    );
  }

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

      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edytuj koszt"
          className="rounded-btn p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-fg"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>

        <DeleteExpense expenseId={expense.id} />
      </span>
    </div>
  );
}

"use client";

import {
  Banknote,
  Briefcase,
  Building2,
  FileText,
  Hammer,
  KeyRound,
  Landmark,
  type LucideIcon,
  Pencil,
  Percent,
  Repeat,
  Scale,
  Shield,
  Sofa,
  Tag,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { DeleteExpense } from "@/components/panel/expenses/delete-expense";
import {
  ExpenseForm,
  type ExpensePropertyOption,
} from "@/components/panel/expenses/expense-form";
import { Badge } from "@/components/ui/badge";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import type { ExpenseListItem } from "@/lib/expenses/service";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  describeRecurrence,
  expenseCategoryLabels,
} from "@/lib/validations/expense";
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/client";

/** Ikona kategorii w kafelku wiersza (redesign/14-finanse-koszty.svg). */
const CATEGORY_ICON: Record<ExpenseCategory, LucideIcon> = {
  COMMUNITY_FEE: Building2,
  RENT: KeyRound,
  MORTGAGE: Banknote,
  UTILITIES: Zap,
  REPAIR: Hammer,
  FURNISHING: Sofa,
  INSURANCE: Shield,
  PROPERTY_TAX: Percent,
  INCOME_TAX: Landmark,
  MANAGEMENT: Briefcase,
  ACCOUNTING: FileText,
  LEGAL: Scale,
  OTHER: Tag,
};

/**
 * Jedna pozycja kosztu. Na pełnej liście (`showProperty`) układa się w tabelę:
 * data, koszt, nieruchomość, cykl, kwota. W karcie nieruchomości — bez
 * kolumny nieruchomości, data przechodzi do drugiej linii.
 */
export function ExpenseRow({
  expense,
  showProperty = true,
  properties = [],
  lockedPropertyId = null,
}: {
  expense: ExpenseListItem;
  /** Wyłączone na karcie nieruchomości — tam wiadomo, której dotyczy. */
  showProperty?: boolean;
  /** Lista do wyboru nieruchomości w edycji — patrz `ExpenseForm`. */
  properties?: ExpensePropertyOption[];
  lockedPropertyId?: string | null;
}) {
  const { d, locale, date } = useI18n();
  const misc = d.panel.panelMisc;
  const [editing, setEditing] = useState(false);
  const Icon = CATEGORY_ICON[expense.category] ?? Tag;
  const category = expenseCategoryLabels(d)[expense.category];

  // Cykl widać tylko na wzorcu. Naliczone z niego pozycje są zwykłymi
  // kosztami — powielony znacznik sugerowałby, że każda z nich nalicza
  // coś dalej od siebie.
  const recurrenceBadge = expense.recurrence ? (
    <Badge icon={Repeat} className="whitespace-normal text-left">
      {describeRecurrence(expense.recurrence, expense.recurrenceEveryDays, d)}
    </Badge>
  ) : null;

  const meta = [
    expense.vendor ? `${category}, ${expense.vendor}` : category,
    expense.documentRef,
    expense.recurrence && expense.recurrenceNextAt
      ? fill(misc.expenseNext, {
          date: date(expense.recurrenceNextAt, "short"),
        })
      : null,
    expense.recurringFromId ? misc.expenseAuto : null,
  ].filter(Boolean);

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover lg:min-h-16 lg:gap-4 lg:px-6">
      {showProperty ? (
        <span className="hidden w-[88px] shrink-0 font-mono text-sm text-muted lg:block">
          {date(expense.paidAt, "short")}
        </span>
      ) : null}

      <span
        className="hidden size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-alt text-muted sm:flex"
        aria-hidden
      >
        <Icon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-[550] break-words text-fg">
          {expense.description}
        </p>
        <p className="mt-0.5 text-[13px] break-words text-muted">
          {/* Data i nieruchomość tutaj tylko tam, gdzie nie mają własnej kolumny. */}
          <span className={showProperty ? "lg:hidden" : undefined}>
            {date(expense.paidAt, "short")}
            {showProperty
              ? `, ${expense.property?.name ?? misc.generalExpense}`
              : null}
            {", "}
          </span>
          {meta.join(", ")}
        </p>
        {recurrenceBadge ? (
          <span className={cn("mt-1.5 flex", showProperty && "lg:hidden")}>
            {recurrenceBadge}
          </span>
        ) : null}
      </div>

      {showProperty ? (
        <>
          <span
            className={cn(
              "hidden w-[200px] shrink-0 truncate text-sm lg:block",
              expense.property ? "text-fg" : "text-subtle",
            )}
          >
            {expense.property?.name ?? misc.generalExpense}
          </span>
          <span className="hidden w-[150px] shrink-0 lg:flex">
            {recurrenceBadge}
          </span>
        </>
      ) : null}

      <div className="flex shrink-0 flex-col items-end gap-0.5 lg:flex-row lg:items-center lg:gap-4">
        <span
          className={cn(
            "shrink-0 text-right font-mono text-[14.5px] font-semibold whitespace-nowrap text-fg",
            showProperty && "lg:w-[120px]",
          )}
        >
          {formatMoney(expense.amountGrosze, locale)}
        </span>

        <span className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={d.panel.financePage.editExpense}
            className="flex size-8 items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface-alt hover:text-fg"
          >
            <Pencil className="size-4" aria-hidden />
          </button>

          <DeleteExpense
            expenseId={expense.id}
            summary={`${expense.description}, ${formatMoney(expense.amountGrosze, locale)}`}
          />
        </span>
      </div>

      {editing ? (
        <ExpenseForm
          expenseId={expense.id}
          properties={properties}
          lockedPropertyId={lockedPropertyId}
          onClose={() => setEditing(false)}
          defaultValues={{
            propertyId: expense.property?.id ?? "",
            category: expense.category,
            amountGrosze: (expense.amountGrosze / 100).toFixed(2),
            paidAt: expense.paidAt.toISOString().slice(0, 10),
            description: expense.description,
            vendor: expense.vendor ?? "",
            documentRef: expense.documentRef ?? "",
            notes: expense.notes ?? "",
            recurring: expense.recurrence !== null,
            recurrence: expense.recurrence ?? "MONTHLY",
            recurrenceEveryDays: expense.recurrenceEveryDays ?? "",
          }}
        />
      ) : null}
    </div>
  );
}

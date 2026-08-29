import type { Prisma } from "@/generated/prisma/client";
import type { ExpenseRecurrence } from "@/generated/prisma/enums";
import { nextOccurrence } from "@/lib/expenses/schedule";
import { prisma } from "@/lib/prisma";
import type {
  ExpenseFormOutput,
  ExpenseListQuery,
  ExpenseUpdateOutput,
} from "@/lib/validations/expense";

/**
 * Koszty właściciela.
 *
 * Zawężenie do `organizationId` z sesji, jak w pozostałych serwisach.
 */

export type ExpenseListItem = Awaited<ReturnType<typeof listExpenses>>[number];

function listWhere(organizationId: string, query: ExpenseListQuery): Prisma.ExpenseWhereInput {
  return {
    organizationId,
    ...(query.category ? { category: query.category } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.year
      ? {
          paidAt: {
            gte: new Date(Date.UTC(query.year, 0, 1)),
            lt: new Date(Date.UTC(query.year + 1, 0, 1)),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { description: { contains: query.q, mode: "insensitive" } },
            { vendor: { contains: query.q, mode: "insensitive" } },
            { documentRef: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/** Jeden kształt wiersza dla zestawienia i dla karty nieruchomości. */
const listSelect = {
  id: true,
  category: true,
  amountGrosze: true,
  paidAt: true,
  description: true,
  vendor: true,
  documentRef: true,
  recurrence: true,
  recurrenceEveryDays: true,
  recurrenceNextAt: true,
  recurringFromId: true,
  property: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseSelect;

const listOrder = [
  { paidAt: "desc" },
  { createdAt: "desc" },
] satisfies Prisma.ExpenseOrderByWithRelationInput[];

export async function listExpenses(organizationId: string, query: ExpenseListQuery) {
  return prisma.expense.findMany({
    where: listWhere(organizationId, query),
    select: listSelect,
    orderBy: listOrder,
    take: 300,
  });
}

/**
 * Koszty jednej nieruchomości — wycinek na jej kartę.
 *
 * Zwraca też sumę i liczbę wszystkich pozycji, nie tylko pobranych: karta
 * pokazuje kilka ostatnich, a suma ma być z całości, inaczej po roku
 * pokazywałaby ułamek tego, co ten lokal naprawdę kosztował.
 */
export async function propertyExpenses(organizationId: string, propertyId: string, limit = 5) {
  const where: Prisma.ExpenseWhereInput = { organizationId, propertyId };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, select: listSelect, orderBy: listOrder, take: limit }),
    prisma.expense.aggregate({ where, _sum: { amountGrosze: true }, _count: true }),
  ]);

  return {
    items,
    count: total._count,
    totalGrosze: total._sum.amountGrosze ?? 0,
  };
}

/**
 * Sumy do nagłówka listy: razem i w rozbiciu na kategorie.
 *
 * Liczone przez `groupBy` po stronie Postgresa, a nie z pobranych rekordów —
 * lista jest ucięta do 300 pozycji, więc sumowanie w pamięci pokazywałoby
 * kwotę mniejszą niż prawdziwa, im więcej kosztów tym bardziej.
 */
export async function expenseSummary(organizationId: string, query: ExpenseListQuery) {
  const where = listWhere(organizationId, query);

  const [total, byCategory] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amountGrosze: true }, _count: true }),
    prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amountGrosze: true },
      orderBy: { _sum: { amountGrosze: "desc" } },
    }),
  ]);

  return {
    count: total._count,
    totalGrosze: total._sum.amountGrosze ?? 0,
    byCategory: byCategory.map((bucket) => ({
      category: bucket.category,
      totalGrosze: bucket._sum.amountGrosze ?? 0,
    })),
  };
}

export async function getExpense(organizationId: string, expenseId: string) {
  return prisma.expense.findFirst({
    where: { id: expenseId, organizationId },
    include: { property: { select: { id: true, name: true } } },
  });
}

export type CreateExpenseResult =
  | { ok: true; expense: { id: string } }
  | { ok: false; reason: "PROPERTY_NOT_FOUND" };

export async function createExpense(
  organizationId: string,
  data: ExpenseFormOutput,
): Promise<CreateExpenseResult> {
  // Nieruchomość musi należeć do tej organizacji — bez sprawdzenia dałoby się
  // podpiąć koszt pod cudzą, podając jej identyfikator.
  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, organizationId },
      select: { id: true },
    });
    if (!property) return { ok: false, reason: "PROPERTY_NOT_FOUND" };
  }

  const expense = await prisma.expense.create({
    data: {
      organizationId,
      ...data,
      // Wpisana pozycja jest pierwszym wystąpieniem, więc kolejny termin
      // liczymy od niej, a nie od dzisiaj.
      recurrenceNextAt: data.recurrence
        ? nextOccurrence(data.paidAt, data.paidAt, data.recurrence, data.recurrenceEveryDays)
        : null,
    },
    select: { id: true },
  });

  return { ok: true, expense };
}

export async function updateExpense(
  organizationId: string,
  expenseId: string,
  data: ExpenseUpdateOutput,
): Promise<CreateExpenseResult | { ok: false; reason: "NOT_FOUND" }> {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId },
    select: {
      id: true,
      paidAt: true,
      recurrence: true,
      recurrenceEveryDays: true,
      recurrenceNextAt: true,
    },
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, organizationId },
      select: { id: true },
    });
    if (!property) return { ok: false, reason: "PROPERTY_NOT_FOUND" };
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { ...data, ...recurrenceUpdate(existing, data) },
    select: { id: true },
  });

  return { ok: true, expense };
}

type RecurrenceState = {
  paidAt: Date;
  recurrence: ExpenseRecurrence | null;
  recurrenceEveryDays: number | null;
  recurrenceNextAt: Date | null;
};

/**
 * Termin kolejnego naliczenia po edycji.
 *
 * Zmiana cyklu albo daty poniesienia unieważnia zapisany termin, więc liczymy
 * go od nowa. Bez tego zmiana „co rok" na „co miesiąc" nie ruszyłaby naliczania
 * z miejsca aż do przyszłorocznego terminu.
 */
function recurrenceUpdate(
  existing: RecurrenceState,
  data: ExpenseUpdateOutput,
): { recurrenceNextAt?: Date | null } {
  const recurrence = "recurrence" in data ? (data.recurrence ?? null) : existing.recurrence;
  if (!recurrence) return "recurrence" in data ? { recurrenceNextAt: null } : {};

  const paidAt = data.paidAt ?? existing.paidAt;
  const everyDays =
    "recurrenceEveryDays" in data
      ? (data.recurrenceEveryDays ?? null)
      : existing.recurrenceEveryDays;

  const unchanged =
    recurrence === existing.recurrence &&
    everyDays === existing.recurrenceEveryDays &&
    paidAt.getTime() === existing.paidAt.getTime();

  // Edycja opisu czy kwoty nie ma prawa cofnąć naliczania do już rozliczonych
  // miesięcy — przy nietkniętym cyklu zostawiamy termin, jaki był.
  if (unchanged && existing.recurrenceNextAt) return {};

  return { recurrenceNextAt: nextOccurrence(paidAt, paidAt, recurrence, everyDays) };
}

/**
 * Koszt usuwamy naprawdę, bez archiwizacji.
 *
 * To zapis pomocniczy właściciela, a nie dokument księgowy — w przeciwieństwie
 * do faktury nie ma numeru w rejestrze, więc nic nie zostawia dziury.
 */
export async function deleteExpense(organizationId: string, expenseId: string) {
  const { count } = await prisma.expense.deleteMany({
    where: { id: expenseId, organizationId },
  });

  return count > 0;
}

/** Lata, w których cokolwiek zapisano — do przełącznika roku. */
export async function expenseYears(organizationId: string): Promise<number[]> {
  const rows = await prisma.expense.findMany({
    where: { organizationId },
    select: { paidAt: true },
    orderBy: { paidAt: "desc" },
    take: 2000,
  });

  return [...new Set(rows.map((row) => row.paidAt.getUTCFullYear()))].sort((a, b) => b - a);
}

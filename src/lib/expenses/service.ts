import type { Prisma } from "@/generated/prisma/client";
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

export async function listExpenses(organizationId: string, query: ExpenseListQuery) {
  return prisma.expense.findMany({
    where: listWhere(organizationId, query),
    select: {
      id: true,
      category: true,
      amountGrosze: true,
      paidAt: true,
      description: true,
      vendor: true,
      documentRef: true,
      property: { select: { id: true, name: true } },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
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
    data: { organizationId, ...data },
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
    select: { id: true },
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
    data,
    select: { id: true },
  });

  return { ok: true, expense };
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

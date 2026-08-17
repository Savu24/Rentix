import type { ExpenseCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import {
  collectionStats,
  monthlyBreakdown,
  propertyBreakdown,
  type CashEntry,
  type CollectionStats,
  type MonthlyRow,
  type PropertyRow,
} from "./aggregate";

/**
 * Raport roczny: przychód kasowy, koszty i wynik.
 */

export type AnnualReport = {
  year: number;
  months: MonthlyRow[];
  properties: PropertyRow[];
  expensesByCategory: Array<{ category: ExpenseCategory; totalGrosze: number }>;
  totals: {
    incomeGrosze: number;
    expenseGrosze: number;
    profitGrosze: number;
  };
  collection: CollectionStats;
};

const yearRange = (year: number) => ({
  gte: new Date(Date.UTC(year, 0, 1)),
  lt: new Date(Date.UTC(year + 1, 0, 1)),
});

export async function annualReport(organizationId: string, year: number): Promise<AnnualReport> {
  const range = yearRange(year);

  const [payments, expenses, properties, invoices] = await Promise.all([
    // Wpłata wie, do której nieruchomości należy, dopiero przez fakturę i umowę —
    // stąd zagnieżdżony select zamiast płaskiego pola.
    prisma.payment.findMany({
      where: { organizationId, paidAt: range },
      select: {
        amountGrosze: true,
        paidAt: true,
        invoice: { select: { lease: { select: { propertyId: true } } } },
      },
    }),
    prisma.expense.findMany({
      where: { organizationId, paidAt: range },
      select: { amountGrosze: true, paidAt: true, propertyId: true, category: true },
    }),
    prisma.property.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
    // Ściągalność liczymy po terminie płatności, a nie po dacie wpłaty:
    // pytanie brzmi „ile z rachunków wystawionych na ten rok zostało
    // zapłaconych", a rachunek z grudnia bywa płacony w styczniu.
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { not: "CANCELLED" },
        dueDate: range,
      },
      select: {
        dueDate: true,
        totalGrossGrosze: true,
        paidGrosze: true,
        payments: { orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true } },
      },
    }),
  ]);

  const incomeEntries: CashEntry[] = payments.map((payment) => ({
    at: payment.paidAt,
    amountGrosze: payment.amountGrosze,
    propertyId: payment.invoice.lease?.propertyId ?? null,
  }));

  const expenseEntries: CashEntry[] = expenses.map((expense) => ({
    at: expense.paidAt,
    amountGrosze: expense.amountGrosze,
    propertyId: expense.propertyId,
  }));

  const names = new Map(properties.map((property) => [property.id, property.name]));
  const months = monthlyBreakdown(incomeEntries, expenseEntries);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amountGrosze);
  }

  const incomeGrosze = incomeEntries.reduce((total, entry) => total + entry.amountGrosze, 0);
  const expenseGrosze = expenseEntries.reduce((total, entry) => total + entry.amountGrosze, 0);

  return {
    year,
    months,
    properties: propertyBreakdown(incomeEntries, expenseEntries, names),
    expensesByCategory: [...byCategory.entries()]
      .map(([category, totalGrosze]) => ({ category, totalGrosze }))
      .sort((a, b) => b.totalGrosze - a.totalGrosze),
    totals: {
      incomeGrosze,
      expenseGrosze,
      profitGrosze: incomeGrosze - expenseGrosze,
    },
    collection: collectionStats(
      invoices.map((invoice) => ({
        dueDate: invoice.dueDate,
        totalGrossGrosze: invoice.totalGrossGrosze,
        paidGrosze: invoice.paidGrosze,
        lastPaymentAt: invoice.payments[0]?.paidAt ?? null,
      })),
    ),
  };
}

/**
 * Lata, dla których jest co pokazać.
 *
 * Bieżący rok jest na liście zawsze, nawet pusty — inaczej świeże konto
 * dostawałoby przełącznik bez jednej pozycji i raport nie miałby się na czym
 * oprzeć.
 */
export async function reportYears(organizationId: string): Promise<number[]> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { organizationId },
      select: { paidAt: true },
      orderBy: { paidAt: "asc" },
      take: 1,
    }),
    prisma.expense.findMany({
      where: { organizationId },
      select: { paidAt: true },
      orderBy: { paidAt: "asc" },
      take: 1,
    }),
  ]);

  const current = new Date().getUTCFullYear();
  const earliest = Math.min(
    payments[0]?.paidAt.getUTCFullYear() ?? current,
    expenses[0]?.paidAt.getUTCFullYear() ?? current,
  );

  const years: number[] = [];
  for (let year = current; year >= earliest; year -= 1) years.push(year);
  return years;
}

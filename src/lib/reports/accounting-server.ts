import { prisma } from "@/lib/prisma";

import type {
  AccountingExport,
  DateRange,
  DocumentRecord,
} from "./accounting";

/**
 * Odczyt danych eksportu księgowego.
 *
 * Osobno od `accounting.ts` z tego samego powodu, co `billing/server.ts` od
 * `billing/plans.ts`: tamten plik nie dotyka Prismy, więc czyta go i test,
 * i komponent w przeglądarce. Tutaj mieszka wszystko, co wymaga zapytania.
 */

/** Koniec przedziału jako granica `lt` — patrz `parseRange`. */
const exclusiveEnd = (to: Date) => new Date(to.getTime() + 24 * 60 * 60 * 1000);

export async function accountingExport(
  organizationId: string,
  range: DateRange,
): Promise<AccountingExport> {
  const window = { gte: range.from, lt: exclusiveEnd(range.to) };

  const [invoices, payments, expenses] = await Promise.all([
    prisma.invoice.findMany({
      // Szkice nie są dokumentami — do rejestru wchodzi to, co wystawiono.
      where: { organizationId, status: { not: "DRAFT" }, issueDate: window },
      orderBy: [{ issueDate: "asc" }, { number: "asc" }],
      select: {
        number: true,
        kind: true,
        status: true,
        issueDate: true,
        saleDate: true,
        dueDate: true,
        buyerName: true,
        buyerTaxId: true,
        totalNetGrosze: true,
        totalVatGrosze: true,
        totalGrossGrosze: true,
        paidGrosze: true,
        lease: { select: { property: { select: { name: true } } } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId, paidAt: window },
      orderBy: { paidAt: "asc" },
      select: {
        paidAt: true,
        amountGrosze: true,
        method: true,
        reference: true,
        invoice: { select: { number: true, buyerName: true } },
      },
    }),
    prisma.expense.findMany({
      where: { organizationId, paidAt: window },
      orderBy: { paidAt: "asc" },
      select: {
        paidAt: true,
        category: true,
        description: true,
        vendor: true,
        documentRef: true,
        amountGrosze: true,
        property: { select: { name: true } },
      },
    }),
  ]);

  const documents: DocumentRecord[] = invoices.map((invoice) => ({
    number: invoice.number,
    kind: invoice.kind,
    status: invoice.status,
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    buyerName: invoice.buyerName,
    buyerTaxId: invoice.buyerTaxId,
    propertyName: invoice.lease?.property.name ?? null,
    totalNetGrosze: invoice.totalNetGrosze,
    totalVatGrosze: invoice.totalVatGrosze,
    totalGrossGrosze: invoice.totalGrossGrosze,
    paidGrosze: invoice.paidGrosze,
  }));

  return {
    range,
    documents,
    payments: payments.map((payment) => ({
      paidAt: payment.paidAt,
      invoiceNumber: payment.invoice.number,
      payerName: payment.invoice.buyerName,
      amountGrosze: payment.amountGrosze,
      method: payment.method,
      reference: payment.reference,
    })),
    expenses: expenses.map((expense) => ({
      paidAt: expense.paidAt,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor,
      documentRef: expense.documentRef,
      propertyName: expense.property?.name ?? null,
      amountGrosze: expense.amountGrosze,
    })),
    totals: {
      // Anulowane dokumenty zostają w rejestrze (numeracja musi być ciągła),
      // ale nie wchodzą do sum — nic z nich nie należy się do zapłaty.
      invoicedGrosze: sum(documents, (row) => row.totalGrossGrosze),
      invoicedNetGrosze: sum(documents, (row) => row.totalNetGrosze),
      invoicedVatGrosze: sum(documents, (row) => row.totalVatGrosze),
      receivedGrosze: payments.reduce((total, row) => total + row.amountGrosze, 0),
      expensesGrosze: expenses.reduce((total, row) => total + row.amountGrosze, 0),
    },
  };
}

function sum(rows: readonly DocumentRecord[], pick: (row: DocumentRecord) => number): number {
  return rows.reduce(
    (total, row) => (row.status === "CANCELLED" ? total : total + pick(row)),
    0,
  );
}

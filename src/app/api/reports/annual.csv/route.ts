import type { NextRequest } from "next/server";

import { requireApiFeature } from "@/lib/auth/session";
import { buildCsv, toCsvAmount } from "@/lib/reports/aggregate";
import { annualReport } from "@/lib/reports/service";
import { expenseCategoryLabels } from "@/lib/validations/expense";
import { fill } from "@/lib/i18n/format";

export const runtime = "nodejs";

/**
 * GET /api/reports/annual.csv?rok=2026 — zestawienie roczne dla księgowego.
 *
 * CSV, a nie PDF: to plik do dalszej obróbki w arkuszu, a nie dokument
 * do podpisania. Trzy sekcje w jednym pliku (miesiące, nieruchomości,
 * kategorie kosztów) zamiast trzech plików — księgowy dostaje jeden załącznik.
 *
 * Zestawienie roczne wchodzi z planem Start, tak samo jak sama strona raportów.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiFeature("ANNUAL_REPORT");
  if ("response" in auth) return auth.response;

  const requested = Number(request.nextUrl.searchParams.get("rok"));
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100
    ? requested
    : new Date().getUTCFullYear();

  const t = auth.d.panel.reportsPage;
  const report = await annualReport(auth.organizationId, year, auth.locale, {
    deletedProperty: t.deletedProperty,
    generalCosts: t.generalCosts,
  });

  const rows: string[][] = [];

  rows.push([t.csv.month, t.income, t.expenses, t.profit]);
  for (const month of report.months) {
    rows.push([
      month.label,
      toCsvAmount(month.incomeGrosze, auth.locale),
      toCsvAmount(month.expenseGrosze, auth.locale),
      toCsvAmount(month.profitGrosze, auth.locale),
    ]);
  }
  rows.push([
    t.csv.total,
    toCsvAmount(report.totals.incomeGrosze, auth.locale),
    toCsvAmount(report.totals.expenseGrosze, auth.locale),
    toCsvAmount(report.totals.profitGrosze, auth.locale),
  ]);

  rows.push([]);
  rows.push([t.property, t.income, t.expenses, t.profit]);
  for (const property of report.properties) {
    rows.push([
      property.name,
      toCsvAmount(property.incomeGrosze, auth.locale),
      toCsvAmount(property.expenseGrosze, auth.locale),
      toCsvAmount(property.profitGrosze, auth.locale),
    ]);
  }

  rows.push([]);
  rows.push([t.csv.category, t.csv.amount]);
  for (const bucket of report.expensesByCategory) {
    rows.push([expenseCategoryLabels(auth.d)[bucket.category], toCsvAmount(bucket.totalGrosze, auth.locale)]);
  }

  const csv = buildCsv([fill(t.csv.heading, { year })], rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fill(t.csv.fileName, { year })}"`,
      "Cache-Control": "no-store",
    },
  });
}

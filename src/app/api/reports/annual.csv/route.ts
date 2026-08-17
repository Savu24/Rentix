import type { NextRequest } from "next/server";

import { requireApiOwner } from "@/lib/auth/session";
import { buildCsv, toCsvAmount } from "@/lib/reports/aggregate";
import { annualReport } from "@/lib/reports/service";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/validations/expense";

export const runtime = "nodejs";

/**
 * GET /api/reports/annual.csv?rok=2026 — zestawienie roczne dla księgowego.
 *
 * CSV, a nie PDF: to plik do dalszej obróbki w arkuszu, a nie dokument
 * do podpisania. Trzy sekcje w jednym pliku (miesiące, nieruchomości,
 * kategorie kosztów) zamiast trzech plików — księgowy dostaje jeden załącznik.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const requested = Number(request.nextUrl.searchParams.get("rok"));
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100
    ? requested
    : new Date().getUTCFullYear();

  const report = await annualReport(auth.organizationId, year);

  const rows: string[][] = [];

  rows.push(["Miesiąc", "Przychód", "Koszty", "Wynik"]);
  for (const month of report.months) {
    rows.push([
      month.label,
      toCsvAmount(month.incomeGrosze),
      toCsvAmount(month.expenseGrosze),
      toCsvAmount(month.profitGrosze),
    ]);
  }
  rows.push([
    "RAZEM",
    toCsvAmount(report.totals.incomeGrosze),
    toCsvAmount(report.totals.expenseGrosze),
    toCsvAmount(report.totals.profitGrosze),
  ]);

  rows.push([]);
  rows.push(["Nieruchomość", "Przychód", "Koszty", "Wynik"]);
  for (const property of report.properties) {
    rows.push([
      property.name,
      toCsvAmount(property.incomeGrosze),
      toCsvAmount(property.expenseGrosze),
      toCsvAmount(property.profitGrosze),
    ]);
  }

  rows.push([]);
  rows.push(["Kategoria kosztu", "Kwota"]);
  for (const bucket of report.expensesByCategory) {
    rows.push([EXPENSE_CATEGORY_LABEL[bucket.category], toCsvAmount(bucket.totalGrosze)]);
  }

  const csv = buildCsv([`Zestawienie roczne ${year} (rozliczenie kasowe)`], rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rentix-zestawienie-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

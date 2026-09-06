import type { NextRequest } from "next/server";

import { requireApiFeature } from "@/lib/auth/session";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { buildCsv } from "@/lib/reports/aggregate";
import { accountingExport } from "@/lib/reports/accounting-server";
import {
  accountingCsvRows,
  isExportScope,
  parseRange,
  type ExportScope,
} from "@/lib/reports/accounting";
import { expenseCategoryLabels } from "@/lib/validations/expense";
import { invoiceKindLabels, paymentMethodLabels } from "@/lib/validations/invoice";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * GET /api/reports/accounting.csv?od=&do=&zakres= — wyciąg dla księgowego.
 *
 * Jeden plik z trzema rejestrami zamiast trzech załączników, tak samo jak
 * przy zestawieniu rocznym: księgowy dostaje jedną rzecz do otwarcia.
 * `zakres` pozwala pobrać sam rejestr sprzedaży albo same koszty, gdy księgowość
 * wczytuje je osobno.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiFeature("ACCOUNTING_EXPORT");
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const range = parseRange(params.get("od"), params.get("do"), new Date().getUTCFullYear());

  const requestedScope = params.get("zakres");
  const scope: ExportScope = isExportScope(requestedScope) ? requestedScope : "all";

  const data = await accountingExport(auth.organizationId, range);
  const t = auth.d.panel.accountingExport;

  const rows = accountingCsvRows(data, scope, auth.locale, {
    heading: t.csv.heading,
    documents: {
      title: t.csv.documentsTitle,
      columns: t.csv.documentsColumns,
      kinds: invoiceKindLabels(auth.d),
      statuses: t.csv.statuses,
    },
    payments: {
      title: t.csv.paymentsTitle,
      columns: t.csv.paymentsColumns,
      methods: paymentMethodLabels(auth.d),
    },
    expenses: {
      title: t.csv.expensesTitle,
      columns: t.csv.expensesColumns,
      categories: expenseCategoryLabels(auth.d),
    },
    summary: t.csv.summary,
    unassigned: t.csv.unassigned,
  });

  const period = `${formatDateIn(range.from, auth.locale, "short")} – ${formatDateIn(
    range.to,
    auth.locale,
    "short",
  )}`;

  const csv = buildCsv([fill(t.csv.heading, { period })], rows);

  // Daty w nazwie pliku w formacie ISO, a nie w zapisie kraju: nazwy plików
  // sortują się alfabetycznie, więc „2026-01-01" układa je chronologicznie,
  // a „01.01.2026" — po dniu miesiąca.
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const fileName = `${slugify(t.csv.fileNameBase)}-${iso(range.from)}-${iso(range.to)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

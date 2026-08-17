import { Download } from "lucide-react";
import type { Metadata } from "next";

import { CashflowChart } from "@/components/panel/reports/cashflow-chart";
import { YearPicker } from "@/components/panel/reports/year-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatPLN } from "@/lib/money";
import { annualReport, reportYears } from "@/lib/reports/service";
import { plural } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/validations/expense";

export const metadata: Metadata = { title: "Raporty" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/raporty");
  const organizationId = session.user.organizationId;
  const params = await searchParams;

  const years = await reportYears(organizationId);
  const requested = Number(params.rok);
  // Rok z URL-a musi być na liście — inaczej „?rok=1999" wygenerowałby pusty
  // raport wyglądający jak awaria.
  const year = years.includes(requested) ? requested : years[0]!;

  const report = await annualReport(organizationId, year);
  const { totals, collection } = report;
  const profitable = totals.profitGrosze >= 0;

  const hasData = totals.incomeGrosze > 0 || totals.expenseGrosze > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">Raporty</h1>
          <p className="text-sm text-muted">
            Rozliczenie kasowe — liczy się dzień, w którym pieniądze wpłynęły albo wyszły.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <YearPicker years={years} selected={year} />
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/reports/annual.csv?rok=${year}`}>
              <Download className="h-4 w-4" aria-hidden />
              Pobierz CSV
            </a>
          </Button>
        </div>
      </div>

      {!hasData ? (
        <Alert tone="info">
          Za {year} rok nie ma jeszcze żadnych wpłat ani kosztów. Raport wypełni się sam, gdy
          zaczniesz księgować wpłaty i wpisywać wydatki.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Przychód" value={formatPLN(totals.incomeGrosze)} hint="wpłaty od najemców" />
        <Tile label="Koszty" value={formatPLN(totals.expenseGrosze)} hint="wydatki właściciela" />
        <Tile
          label="Wynik"
          value={formatPLN(totals.profitGrosze)}
          hint={profitable ? "na plusie" : "na minusie"}
          tone={profitable ? "good" : "critical"}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Przychód i koszty w miesiącach</h2>
          <CashflowChart data={report.months} />
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Wynik wg nieruchomości</h2>

            {report.properties.length === 0 ? (
              <p className="text-sm text-muted">Brak danych za ten rok.</p>
            ) : (
              <div className="flex flex-col">
                {report.properties.map((row) => (
                  <div
                    key={row.propertyId ?? "general"}
                    className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{row.name}</span>
                    <span className="tabular w-24 text-right font-mono text-xs text-muted">
                      {formatPLN(row.incomeGrosze)}
                    </span>
                    <span className="tabular w-24 text-right font-mono text-xs text-muted">
                      −{formatPLN(row.expenseGrosze)}
                    </span>
                    <span
                      className={`tabular w-24 text-right font-mono text-sm ${
                        row.profitGrosze >= 0 ? "text-fg" : "text-bad"
                      }`}
                    >
                      {formatPLN(row.profitGrosze)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Koszty wg kategorii</h2>

            {report.expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted">
                Nie wpisano jeszcze żadnych kosztów za ten rok.
              </p>
            ) : (
              <div className="flex flex-col">
                {report.expensesByCategory.map((bucket) => {
                  // Udział liczony od sumy kosztów, nie od przychodu —
                  // pasek ma pokazywać strukturę wydatków.
                  const share =
                    totals.expenseGrosze === 0
                      ? 0
                      : Math.round((bucket.totalGrosze / totals.expenseGrosze) * 100);

                  return (
                    <div key={bucket.category} className="flex flex-col gap-1 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-fg">
                          {EXPENSE_CATEGORY_LABEL[bucket.category]}
                        </span>
                        <span className="tabular font-mono text-xs text-muted">
                          {formatPLN(bucket.totalGrosze)} · {share}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${share}%`, background: "var(--chart-2)" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Ściągalność</h2>
          <p className="text-sm text-muted">
            Liczona po terminie płatności: ile z rachunków z terminem w {year} roku zostało
            rozliczonych.
          </p>

          <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-3">
            <Stat
              label="Rozliczone"
              value={`${collection.collectionRate}%`}
              hint={`${collection.paidCount} z ${collection.invoicedCount}`}
            />
            <Stat
              label="Zapłacone po terminie"
              value={String(collection.lateCount)}
              hint={plural(collection.lateCount, ["dokument", "dokumenty", "dokumentów"])}
            />
            <Stat
              label="Średnie opóźnienie"
              value={`${collection.averageDelayDays} ${plural(collection.averageDelayDays, ["dzień", "dni", "dni"])}`}
              hint="tylko z zapłaconych po terminie"
            />
          </dl>
        </CardContent>
      </Card>

      <p className="text-xs text-muted">
        Zestawienie liczy przychód otrzymany, więc nadaje się jako podstawa do rozliczenia najmu
        ryczałtem — ale nie jest poradą podatkową. Przed zeznaniem potwierdź kwoty z księgowym.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "critical";
}) {
  const valueColor = { neutral: "text-fg", good: "text-good", critical: "text-bad" }[tone];

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted">{label}</p>
        <p className={`tabular font-mono text-[19px] font-semibold ${valueColor}`}>{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-[17px] font-semibold text-fg">{value}</dd>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

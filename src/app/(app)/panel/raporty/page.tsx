import { Download } from "lucide-react";
import type { Metadata } from "next";

import { CashflowChart } from "@/components/panel/reports/cashflow-chart";
import { YearPicker } from "@/components/panel/reports/year-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
// Kwoty w tabeli idą bez sufiksu waluty — trzy razy „zł" w jednym wierszu
// nie mieści się na telefonie, więc jednostka stoi raz, w nagłówku sekcji.
import { LOCALE_META } from "@/lib/i18n/config";
import { fill, pluralize } from "@/lib/i18n/format";
import { formatAmount, formatMoney } from "@/lib/money";
import { annualReport, reportYears } from "@/lib/reports/service";
import { expenseCategoryLabels } from "@/lib/validations/expense";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.reportsPage.title };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.reportsPage;
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
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">{t.lead}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <YearPicker years={years} selected={year} />
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/reports/annual.csv?rok=${year}`}>
              <Download className="h-4 w-4" aria-hidden />
              {t.downloadCsv}
            </a>
          </Button>
        </div>
      </div>

      {!hasData ? (
        <Alert tone="info">
          {fill(t.noData, { year })}
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label={t.income}
          value={formatMoney(totals.incomeGrosze, locale)}
          hint={t.incomeHint}
        />
        <Tile
          label={t.expenses}
          value={formatMoney(totals.expenseGrosze, locale)}
          hint={t.expensesHint}
        />
        <Tile
          label={t.profit}
          value={formatMoney(totals.profitGrosze, locale)}
          hint={profitable ? t.profitPositive : t.profitNegative}
          tone={profitable ? "good" : "critical"}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.monthlyChart}</h2>
          <CashflowChart data={report.months} />
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">
              {t.byProperty}{" "}
              <span className="font-normal text-muted">
                {fill(t.currencyNote, { currency: LOCALE_META[locale].currency })}
              </span>
            </h2>

            {report.properties.length === 0 ? (
              <p className="text-sm text-muted">{t.noYearData}</p>
            ) : (
              <div className="flex flex-col">
                {/* Nagłówek kolumn: przy zawinięciu na telefonie same trzy
                    kwoty pod nazwą byłyby nie do rozróżnienia. */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-1.5 text-[11px] uppercase tracking-wide text-muted">
                  <span className="hidden flex-1 sm:block">{t.property}</span>
                  <span className="ml-auto w-20 text-right sm:w-24">{t.income}</span>
                  <span className="w-20 text-right sm:w-24">{t.expenses}</span>
                  <span className="w-20 text-right sm:w-24">{t.profit}</span>
                </div>

                {report.properties.map((row) => (
                  // Nazwa zajmuje całą szerokość na telefonie, a kwoty spadają
                  // do drugiej linii: trzy kolumny po 96 px nie mieszczą się
                  // obok siebie w karcie na wąskim ekranie i rozpychały stronę.
                  <div
                    key={row.propertyId ?? "general"}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 basis-full truncate text-sm text-fg sm:flex-1 sm:basis-auto">
                      {row.name}
                    </span>
                    <span className="tabular ml-auto w-20 text-right font-mono text-xs text-muted sm:w-24">
                      {formatAmount(row.incomeGrosze, locale)}
                    </span>
                    <span className="tabular w-20 text-right font-mono text-xs text-muted sm:w-24">
                      −{formatAmount(row.expenseGrosze, locale)}
                    </span>
                    <span
                      className={`tabular w-20 text-right font-mono text-sm sm:w-24 ${
                        row.profitGrosze >= 0 ? "text-fg" : "text-bad"
                      }`}
                    >
                      {formatAmount(row.profitGrosze, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-fg">{t.byCategory}</h2>

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
                          {expenseCategoryLabels(d)[bucket.category]}
                        </span>
                        <span className="tabular font-mono text-xs text-muted">
                          {formatMoney(bucket.totalGrosze, locale)} · {share}%
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
          <h2 className="text-[15px] font-semibold text-fg">{t.collection}</h2>
          <p className="text-sm text-muted">
            {fill(t.collectionLead, { year })}
          </p>

          <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-3">
            <Stat
              label={t.settled}
              value={`${collection.collectionRate}%`}
              hint={fill(t.settledHint, {
                paid: collection.paidCount,
                invoiced: collection.invoicedCount,
              })}
            />
            <Stat
              label={t.paidLate}
              value={String(collection.lateCount)}
              hint={pluralize(locale, collection.lateCount, d.panel.financePage.documentNoun)}
            />
            <Stat
              label={t.averageDelay}
              value={`${collection.averageDelayDays} ${pluralize(
                locale,
                collection.averageDelayDays,
                t.days,
              )}`}
              hint={t.averageDelayHint}
            />
          </dl>
        </CardContent>
      </Card>

      <p className="text-xs text-muted">
        {t.disclaimer}
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

import { Download } from "lucide-react";
import type { Metadata } from "next";

import { PlanLock } from "@/components/panel/plan-lock";
import { AccountingExport } from "@/components/panel/reports/accounting-export";
import { CashflowChart } from "@/components/panel/reports/cashflow-chart";
import { YearPicker } from "@/components/panel/reports/year-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
// Kwoty w tabeli idą bez sufiksu waluty — trzy razy „zł" w jednym wierszu
// nie mieści się na telefonie, więc jednostka stoi raz, w nagłówku sekcji.
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
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

  /*
    Cała strona jest zestawieniem rocznym, a to wchodzi z planem Start —
    dlatego bramka stoi przed liczeniem raportu, a nie przy samym przycisku
    pobierania. Nagłówek zostaje: użytkownik ma zobaczyć, że tu jest sekcja
    raportów, i przeczytać, co się w niej pojawi.
  */
  if (!(await organizationAllows(organizationId, "ANNUAL_REPORT"))) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">{t.lead}</p>
        </div>

        <PlanLock feature="ANNUAL_REPORT" title={t.locked.title} lead={t.locked.lead} />
      </div>
    );
  }

  const years = await reportYears(organizationId);
  const requested = Number(params.rok);
  // Rok z URL-a musi być na liście — inaczej „?rok=1999" wygenerowałby pusty
  // raport wyglądający jak awaria.
  const year = years.includes(requested) ? requested : years[0]!;

  const [report, exportAllowed] = await Promise.all([
    annualReport(organizationId, year, locale, {
      deletedProperty: t.deletedProperty,
      generalCosts: t.generalCosts,
    }),
    organizationAllows(organizationId, "ACCOUNTING_EXPORT"),
  ]);
  const { totals, collection } = report;
  const profitable = totals.profitGrosze >= 0;

  const hasData = totals.incomeGrosze > 0 || totals.expenseGrosze > 0;

  const columnTotals = report.properties.reduce(
    (sum, row) => ({
      monthlyIncomeGrosze: sum.monthlyIncomeGrosze + row.monthlyIncomeGrosze,
      monthlyExpenseGrosze: sum.monthlyExpenseGrosze + row.monthlyExpenseGrosze,
      monthlyProfitGrosze: sum.monthlyProfitGrosze + row.monthlyProfitGrosze,
      incomeGrosze: sum.incomeGrosze + row.incomeGrosze,
      expenseGrosze: sum.expenseGrosze + row.expenseGrosze,
      profitGrosze: sum.profitGrosze + row.profitGrosze,
    }),
    {
      monthlyIncomeGrosze: 0,
      monthlyExpenseGrosze: 0,
      monthlyProfitGrosze: 0,
      incomeGrosze: 0,
      expenseGrosze: 0,
      profitGrosze: 0,
    },
  );

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
            <>
              {/* Siedem kolumn nie zmieści się na telefonie, więc tabela
                  przewija się w poziomie wewnątrz karty, a nie rozpycha strony. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-right">
                  <thead className="text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th rowSpan={2} scope="col" className="pb-1.5 pr-3 text-left align-bottom font-normal">
                        {t.property}
                      </th>
                      <th colSpan={3} scope="colgroup" className="pb-1 pl-3 font-normal normal-case tracking-normal text-fg">
                        {t.currentMonthly}
                      </th>
                      <th colSpan={3} scope="colgroup" className="border-l border-border pb-1 pl-3 font-normal normal-case tracking-normal text-fg">
                        {fill(t.yearTotal, { year })}
                      </th>
                    </tr>
                    <tr className="border-b border-border">
                      {[0, 1].map((group) =>
                        [t.income, t.expenses, t.profitColumn].map((label, index) => (
                          <th
                            key={`${group}-${label}`}
                            scope="col"
                            className={`pb-1.5 pl-3 font-normal ${
                              group === 1 && index === 0 ? "border-l border-border" : ""
                            }`}
                          >
                            {label}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {report.properties.map((row) => (
                      <tr
                        key={row.propertyId ?? "general"}
                        className="border-b border-border last:border-b-0"
                      >
                        <th scope="row" className="py-2.5 pr-3 text-left text-sm font-normal text-fg">
                          {row.name}
                        </th>
                        <AmountCells
                          income={row.monthlyIncomeGrosze}
                          expense={row.monthlyExpenseGrosze}
                          profit={row.monthlyProfitGrosze}
                          locale={locale}
                        />
                        <AmountCells
                          income={row.incomeGrosze}
                          expense={row.expenseGrosze}
                          profit={row.profitGrosze}
                          locale={locale}
                          divided
                        />
                      </tr>
                    ))}
                  </tbody>

                  {/* Suma kolumn pod tabelą. Roczna część zgadza się z kafelkami
                      nad wykresem, ale stoi też tutaj, żeby nie trzeba było
                      dodawać wierszy w głowie, zwłaszcza w kolumnach bieżących. */}
                  <tfoot className="border-t-2 border-border font-semibold">
                    <tr>
                      <th scope="row" className="py-2.5 pr-3 text-left text-sm font-semibold text-fg">
                        {t.total}
                      </th>
                      <AmountCells
                        income={columnTotals.monthlyIncomeGrosze}
                        expense={columnTotals.monthlyExpenseGrosze}
                        profit={columnTotals.monthlyProfitGrosze}
                        locale={locale}
                        emphasis
                      />
                      <AmountCells
                        income={columnTotals.incomeGrosze}
                        expense={columnTotals.expenseGrosze}
                        profit={columnTotals.profitGrosze}
                        locale={locale}
                        divided
                        emphasis
                      />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-muted">{t.currentMonthlyNote}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg">{t.byCategory}</h2>

          {report.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted">
              {t.noCategoryData}
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

      {/* Eksport stoi pod raportem, a nie nad nim: najpierw wynajmujący widzi
          swoje liczby, a dopiero potem wysyła je dalej. */}
      {exportAllowed ? (
        <AccountingExport year={year} />
      ) : (
        <PlanLock
          feature="ACCOUNTING_EXPORT"
          title={d.panel.accountingExport.locked.title}
          lead={d.panel.accountingExport.locked.lead}
        />
      )}

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

/** Trzy kwoty jednej grupy kolumn: przychód, koszty, zysk. */
function AmountCells({
  income,
  expense,
  profit,
  locale,
  divided = false,
  /** Wiersz sum: przychód i koszty w kolorze tekstu, a nie wyciszone. */
  emphasis = false,
}: {
  income: number;
  expense: number;
  profit: number;
  locale: Locale;
  divided?: boolean;
  emphasis?: boolean;
}) {
  const cell = "tabular whitespace-nowrap py-2.5 pl-3 font-mono";
  const secondary = emphasis ? "text-xs text-fg" : "text-xs text-muted";

  return (
    <>
      <td className={`${cell} ${secondary} ${divided ? "border-l border-border" : ""}`}>
        {formatAmount(income, locale)}
      </td>
      <td className={`${cell} ${secondary}`}>
        {expense > 0 ? "−" : ""}
        {formatAmount(expense, locale)}
      </td>
      <td className={`${cell} text-sm ${profit >= 0 ? "text-fg" : "text-bad"}`}>
        {formatAmount(profit, locale)}
      </td>
    </>
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

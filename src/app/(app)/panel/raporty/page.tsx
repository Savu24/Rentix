import { Download, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/panel/page-header";
import { PlanLock } from "@/components/panel/plan-lock";
import { AccountingExport } from "@/components/panel/reports/accounting-export";
import { CashflowChart } from "@/components/panel/reports/cashflow-chart";
import { YearPicker } from "@/components/panel/reports/year-picker";
import { SectionCard } from "@/components/panel/section-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
import type { Locale } from "@/lib/i18n/config";
import { fill, pluralize } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { annualReport, reportYears } from "@/lib/reports/service";
import { expenseCategoryLabels } from "@/lib/validations/expense";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.reportsPage.title };
}

/**
 * Zestawienie roczne (redesign/18-raporty-*.svg): wynik w jednej płycie,
 * wykres miesięcy, wynik wg nieruchomości, ściągalność, koszty wg kategorii
 * i eksport dla księgowego. Zastrzeżenie podatkowe i sposób liczenia siedzą
 * pod ikoną „i" przy tytule.
 */
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

  const title = (
    <span className="inline-flex items-center gap-2">
      {t.title}
      <InfoTip label={t.info}>
        {t.lead} {t.disclaimer}
      </InfoTip>
    </span>
  );

  /*
    Cała strona jest zestawieniem rocznym, a to wchodzi z planem Start —
    dlatego bramka stoi przed liczeniem raportu, a nie przy samym przycisku
    pobierania. Pod kartą blokady widać wyblakły zarys raportu: użytkownik ma
    zobaczyć, co tu będzie, zamiast czytać o tym zdanie.
  */
  if (!(await organizationAllows(organizationId, "ANNUAL_REPORT"))) {
    return (
      <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
        <PageHeader title={t.title} />
        <PlanLock feature="ANNUAL_REPORT" title={t.locked.title} variant="overlay">
          <div className="flex flex-col gap-6">
            <KpiPlate
              locale={locale}
              cells={[
                { label: t.income, grosze: 0 },
                { label: t.expenses, grosze: 0 },
                { label: t.profit, grosze: 0 },
              ]}
            />
            <div className="h-80 rounded-tile border border-border bg-surface" />
          </div>
        </PlanLock>
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

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
      <PageHeader
        title={title}
        actions={
          <>
            <Suspense fallback={null}>
              <YearPicker years={years} selected={year} />
            </Suspense>
            <Button asChild variant="secondary">
              <a href={`/api/reports/annual.csv?rok=${year}`}>
                <Download className="size-[18px]" aria-hidden />
                {t.downloadCsv}
              </a>
            </Button>
          </>
        }
      />

      {!hasData ? <Alert tone="info">{fill(t.noData, { year })}</Alert> : null}

      <KpiPlate
        locale={locale}
        cells={[
          { label: t.income, grosze: totals.incomeGrosze },
          { label: t.expenses, grosze: totals.expenseGrosze },
          {
            label: t.profit,
            grosze: totals.profitGrosze,
            sign: true,
            tone: profitable ? "good" : "bad",
            badge: (
              <Badge tone={profitable ? "good" : "critical"} icon={profitable ? TrendingUp : TrendingDown}>
                {profitable ? t.profitPositive : t.profitNegative}
              </Badge>
            ),
          },
        ]}
      />

      <SectionCard
        title={t.monthlyChart}
        actions={
          <span className="flex items-center gap-5 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-chart-1" aria-hidden />
              {t.income}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-chart-2" aria-hidden />
              {t.expenses}
            </span>
          </span>
        }
      >
        <CashflowChart data={report.months} />
      </SectionCard>

      <SectionCard
        title={t.byProperty}
        actions={<InfoTip label={t.currentMonthly} align="end">{t.currentMonthlyNote}</InfoTip>}
        bodyClassName="px-0 lg:px-0 pb-2 lg:pb-2"
      >
        {report.properties.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted lg:px-6">{t.noYearData}</p>
        ) : (
          /* Siedem kolumn nie zmieści się na telefonie, więc tabela przewija
             się w poziomie wewnątrz karty, a nie rozpycha strony. */
          <div className="overflow-x-auto px-4 lg:px-6">
            <table className="w-full min-w-[900px] border-collapse text-right text-sm">
              <thead className="text-[12.5px] text-muted">
                <tr>
                  <th rowSpan={2} scope="col" className="pb-2 text-left align-bottom font-[550]">
                    {t.property}
                  </th>
                  <th colSpan={3} scope="colgroup" className="pb-1 pl-4 text-center font-[550] text-fg">
                    {t.currentMonthly}
                  </th>
                  <th colSpan={3} scope="colgroup" className="border-l border-border pb-1 pl-4 text-center font-[550] text-fg">
                    {fill(t.yearTotal, { year })}
                  </th>
                </tr>
                <tr className="border-b border-border">
                  {[0, 1].map((group) =>
                    [t.income, t.expenses, t.profitColumn].map((label, index) => (
                      <th
                        key={`${group}-${label}`}
                        scope="col"
                        className={cn("pb-2 pl-4 font-[550]", group === 1 && index === 0 && "border-l border-border")}
                      >
                        {label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.properties.map((row) => (
                  <tr key={row.propertyId ?? "general"} className="border-b border-border last:border-b-0">
                    <th
                      scope="row"
                      className={cn(
                        "py-3.5 pr-3 text-left font-[550]",
                        row.propertyId === null ? "text-muted" : "text-fg",
                      )}
                    >
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
              {/* Suma kolumn pod tabelą — roczna część zgadza się z płytą
                  wyników u góry, bieżącej nigdzie indziej nie ma. */}
              <tfoot className="border-t-2 border-border">
                <tr>
                  <th scope="row" className="py-3.5 pr-3 text-left font-semibold text-fg">
                    {t.total}
                  </th>
                  <AmountCells
                    income={report.propertyTotals.monthlyIncomeGrosze}
                    expense={report.propertyTotals.monthlyExpenseGrosze}
                    profit={report.propertyTotals.monthlyProfitGrosze}
                    locale={locale}
                    emphasis
                  />
                  <AmountCells
                    income={report.propertyTotals.incomeGrosze}
                    expense={report.propertyTotals.expenseGrosze}
                    profit={report.propertyTotals.profitGrosze}
                    locale={locale}
                    divided
                    emphasis
                  />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:p-6">
          <h2 className="flex items-center gap-1.5 text-sm font-[550] text-muted">
            {t.collection}
            <InfoTip label={t.collection}>
              {fill(t.collectionLead, { year })} {t.averageDelay}: {t.averageDelayHint}.
            </InfoTip>
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[38px] leading-none font-[650] tracking-[-0.9px] text-fg">
              {collection.collectionRate}
              <span className="text-[0.55em] font-semibold text-muted">%</span>
            </span>
            <span className="font-mono text-[13px] text-muted">
              {fill(t.settledHint, { paid: collection.paidCount, invoiced: collection.invoicedCount })}
            </span>
          </div>
          <span
            className="block h-2 overflow-hidden rounded-full bg-surface-alt"
            role="progressbar"
            aria-label={t.settled}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={collection.collectionRate}
          >
            <span className="block h-full rounded-full bg-good" style={{ width: `${collection.collectionRate}%` }} />
          </span>
          <dl className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-muted">{t.paidLate}</dt>
              <dd className="text-[14.5px] font-semibold text-fg">
                {collection.lateCount} {pluralize(locale, collection.lateCount, d.panel.financePage.documentNoun)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-muted">{t.averageDelay}</dt>
              <dd className="text-[14.5px] font-semibold text-fg">
                {collection.averageDelayDays} {pluralize(locale, collection.averageDelayDays, t.days)}
              </dd>
            </div>
          </dl>
        </section>

        <SectionCard title={t.byCategory}>
          {report.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted">{t.noCategoryData}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.expensesByCategory.map((bucket) => (
                <li key={bucket.category} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[13.5px] text-fg">{expenseCategoryLabels(d)[bucket.category]}</span>
                    <span className="shrink-0 font-mono text-[13.5px] whitespace-nowrap">
                      <span className="font-semibold text-fg">{formatMoney(bucket.totalGrosze, locale)}</span>
                      <span className="text-muted"> · {bucket.sharePercent}%</span>
                    </span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
                    <span className="block h-full rounded-full bg-chart-2" style={{ width: `${bucket.sharePercent}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Eksport stoi pod raportem, a nie nad nim: najpierw wynajmujący widzi
          swoje liczby, a dopiero potem wysyła je dalej. */}
      {exportAllowed ? (
        <AccountingExport year={year} />
      ) : (
        <PlanLock feature="ACCOUNTING_EXPORT" title={d.panel.accountingExport.locked.title} />
      )}
    </div>
  );
}

/** Płyta z trzema liczbami roku: przychód, koszty, wynik. */
function KpiPlate({
  cells,
  locale,
}: {
  cells: Array<{ label: string; grosze: number; sign?: boolean; tone?: "good" | "bad"; badge?: React.ReactNode }>;
  locale: Locale;
}) {
  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-tile border border-border bg-surface sm:grid-cols-3">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={cn(
            "flex min-w-0 flex-col gap-3 p-5 lg:px-7 lg:py-6",
            index > 0 && "border-t border-border sm:border-t-0 sm:border-l",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-[550] text-muted">{cell.label}</span>
            {cell.badge}
          </div>
          <MoneyDisplay
            grosze={cell.grosze}
            locale={locale}
            sign={cell.sign}
            className={cn(
              "text-[28px] leading-9 tracking-[-0.8px] lg:text-[32px]",
              cell.tone === "good" ? "text-good" : cell.tone === "bad" ? "text-bad" : "text-fg",
            )}
            currencyClassName={cell.tone ? undefined : "text-muted"}
          />
        </div>
      ))}
    </section>
  );
}

/** Trzy kwoty jednej grupy kolumn: przychód, koszty, wynik. */
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
  const cell = "whitespace-nowrap py-3.5 pl-4 font-mono";
  const secondary = emphasis ? "font-semibold text-fg" : "text-muted";

  return (
    <>
      <td className={cn(cell, secondary, divided && "border-l border-border")}>{formatMoney(income, locale)}</td>
      <td className={cn(cell, secondary)}>{formatMoney(expense > 0 ? -expense : 0, locale)}</td>
      <td className={cn(cell, "font-[650]", profit >= 0 ? "text-good" : "text-bad")}>
        {profit > 0 ? "+" : ""}
        {formatMoney(profit, locale)}
      </td>
    </>
  );
}

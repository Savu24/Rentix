import { AlertCircle, CheckCircle2, FilePlus2, Pencil, Receipt, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FinanceTabs } from "@/components/panel/finance-tabs";
import { GenerateInvoices } from "@/components/panel/invoices/generate-invoices";
import { InvoiceFilters } from "@/components/panel/invoices/invoice-filters";
import { InvoiceList } from "@/components/panel/invoices/invoice-list";
import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, pluralize } from "@/lib/i18n/format";
import { financeSummary, listInvoices } from "@/lib/invoices/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { cn } from "@/lib/utils";
import { invoiceListQuerySchema } from "@/lib/validations/invoice";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.financePage.title };
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.financePage;
  const session = await requireOwnerSession("/panel/finanse");
  const params = await searchParams;

  const parsed = invoiceListQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : invoiceListQuerySchema.parse({});

  const [invoices, summary] = await Promise.all([
    listInvoices(session.user.organizationId, query),
    financeSummary(session.user.organizationId),
  ]);

  const filtered = Object.keys(params).some((key) => key !== "sort");
  const month = new Date().getUTCMonth();

  const tiles = [
    {
      label: t.unpaid,
      grosze: summary.unpaidGrosze,
      tone: "text-fg",
      badge: (
        <Badge>
          {fill(pluralize(locale, summary.unpaidCount, t.unpaidDocs), { count: summary.unpaidCount })}
        </Badge>
      ),
    },
    {
      label: t.arrears,
      grosze: summary.overdueGrosze,
      tone: summary.overdueGrosze > 0 ? "text-bad" : "text-fg",
      badge:
        summary.overdueCount > 0 ? (
          <Badge tone="critical" icon={AlertCircle}>
            {fill(t.overdueCount, { count: summary.overdueCount })}
          </Badge>
        ) : null,
    },
    {
      label: fill(d.panel.dashboard.paymentsIn, { month: d.panel.dashboard.paymentsMonths[month] ?? "" }),
      grosze: summary.paidThisMonthGrosze,
      tone: "text-good",
      badge:
        summary.paidThisMonthCount > 0 ? (
          <Badge tone="good" icon={CheckCircle2}>
            {fill(pluralize(locale, summary.paidThisMonthCount, d.panel.dashboard.paymentsCount), {
              count: summary.paidThisMonthCount,
            })}
          </Badge>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t.title}
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href="/panel/finanse/nowy">
                  <FilePlus2 className="size-[18px]" aria-hidden />
                  {t.manualInvoice.open}
                </Link>
              </Button>
              <GenerateInvoices variant="primary" />
            </>
          }
        />
        <FinanceTabs />
      </div>

      {/* Kafle w jednej płycie: do zapłaty, zaległości, wpłaty w miesiącu. */}
      <section className="grid grid-cols-2 overflow-hidden rounded-tile border border-border bg-surface sm:grid-cols-3">
        {tiles.map((tile, index) => (
          <div
            key={tile.label}
            className={cn(
              "flex min-w-0 flex-col gap-3 p-4 sm:p-5 lg:p-7",
              index === 1 && "border-l border-border",
              index === 2 && "col-span-2 border-t border-border sm:col-span-1 sm:border-t-0 sm:border-l",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-[550] text-muted">{tile.label}</span>
              {tile.badge}
            </div>
            <MoneyDisplay
              grosze={tile.grosze}
              locale={locale}
              className={cn("text-[22px] leading-none tracking-[-0.5px] sm:text-[26px] lg:text-[32px] lg:tracking-[-0.8px]", tile.tone)}
            />
          </div>
        ))}
      </section>

      {summary.draftCount > 0 && query.status !== "DRAFT" ? (
        <Alert
          tone="info"
          action={
            <Link href="/panel/finanse?status=DRAFT" className="hover:underline">
              {t.showDrafts}
            </Link>
          }
        >
          <span className="flex items-center gap-2">
            <Pencil className="size-4 shrink-0" aria-hidden />
            {fill(t.draftsWaiting, { count: summary.draftCount })}
          </span>
        </Alert>
      ) : null}

      <Suspense fallback={null}>
        <InvoiceFilters total={invoices.length} />
      </Suspense>

      {invoices.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatchTitle}
            action={
              <Button asChild variant="secondary">
                <Link href="/panel/finanse">
                  <X className="size-[18px]" aria-hidden />
                  {t.invoiceFilters.clear}
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Receipt} title={t.emptyTitle} action={<GenerateInvoices variant="primary" />} />
        )
      ) : (
        <InvoiceList
          invoices={invoices.map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
            kind: invoice.kind,
            displayStatus: invoice.displayStatus,
            buyerName: invoice.buyerName,
            dueDate: invoice.dueDate,
            totalGrossGrosze: invoice.totalGrossGrosze,
            remainingGrosze: invoice.remainingGrosze,
            propertyName: invoice.lease?.property.name ?? null,
            roomName: invoice.lease?.room?.name ?? null,
          }))}
        />
      )}
    </div>
  );
}

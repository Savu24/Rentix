import { Receipt } from "lucide-react";
import type { Metadata } from "next";

import { GenerateInvoices } from "@/components/panel/invoices/generate-invoices";
import { InvoiceFilters } from "@/components/panel/invoices/invoice-filters";
import { InvoiceList } from "@/components/panel/invoices/invoice-list";
import { FinanceTabs } from "@/components/panel/finance-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { financeSummary, listInvoices } from "@/lib/invoices/service";
import { fill, pluralize } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
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

  const filtered = (params.q ?? params.status) !== undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.title}</h1>
          <p className="text-sm text-muted">{t.lead}</p>
        </div>

        <GenerateInvoices />
      </div>

      <FinanceTabs />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label={t.unpaid}
          value={formatMoney(summary.unpaidGrosze, locale)}
          hint={fill(pluralize(locale, summary.unpaidCount, t.unpaidDocs), {
            count: summary.unpaidCount,
          })}
        />
        <SummaryTile
          label={t.arrears}
          value={formatMoney(summary.overdueGrosze, locale)}
          hint={fill(t.overdueCount, { count: summary.overdueCount })}
          tone={summary.overdueGrosze > 0 ? "critical" : "neutral"}
        />
        <SummaryTile
          label={t.paidThisMonth}
          value={formatMoney(summary.paidThisMonthGrosze, locale)}
          hint={t.paidHint}
          tone="good"
        />
      </div>

      <InvoiceFilters total={invoices.length} />

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtered ? t.noMatchTitle : t.emptyTitle}
          description={
            filtered
              ? t.noMatchLead
              : t.emptyLead
          }
        />
      ) : (
        <InvoiceList
          invoices={invoices.map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
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

function SummaryTile({
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
  const valueColor = {
    neutral: "text-fg",
    good: "text-good",
    critical: "text-bad",
  }[tone];

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

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
import { formatPLN } from "@/lib/money";
import { plural } from "@/lib/utils";
import { invoiceListQuerySchema } from "@/lib/validations/invoice";

export const metadata: Metadata = { title: "Finanse" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          <h1 className="r-display text-[26px] leading-tight text-fg">Finanse</h1>
          <p className="text-sm text-muted">Dokumenty rozliczeniowe i wpłaty najemców.</p>
        </div>

        <GenerateInvoices />
      </div>

      <FinanceTabs />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Do zapłaty"
          value={formatPLN(summary.unpaidGrosze)}
          hint={`${summary.unpaidCount} ${plural(summary.unpaidCount, ["dokument", "dokumenty", "dokumentów"])}`}
        />
        <SummaryTile
          label="Zaległości"
          value={formatPLN(summary.overdueGrosze)}
          hint={`${summary.overdueCount} po terminie`}
          tone={summary.overdueGrosze > 0 ? "critical" : "neutral"}
        />
        <SummaryTile
          label="Wpłaty w tym miesiącu"
          value={formatPLN(summary.paidThisMonthGrosze)}
          hint="suma zaksięgowanych wpłat"
          tone="good"
        />
      </div>

      <InvoiceFilters total={invoices.length} />

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtered ? "Żaden dokument nie pasuje do filtrów" : "Nie ma jeszcze dokumentów"}
          description={
            filtered
              ? "Zmień kryteria albo wyczyść filtry, żeby zobaczyć wszystkie dokumenty."
              : "Czynsz nalicza się automatycznie w dniu wskazanym w umowie. Możesz też naliczyć wybrany miesiąc ręcznie."
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

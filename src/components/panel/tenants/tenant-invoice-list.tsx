"use client";

import { Eye } from "lucide-react";
import Link from "next/link";

import { CardRows } from "@/components/panel/section-card";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { MarkPaid } from "@/components/panel/invoices/mark-paid";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { hasRegisterNumber } from "@/lib/invoices/draft";
import type { DisplayInvoiceStatus } from "@/lib/invoices/status";
import { formatMoney } from "@/lib/money";

export type TenantInvoiceRow = {
  id: string;
  number: string;
  displayStatus: DisplayInvoiceStatus;
  dueDate: Date;
  totalGrossGrosze: number;
  remainingGrosze: number;
};

/**
 * Rozliczenia w kartotece najemcy.
 *
 * Ta sama lista co w finansach, tylko zawężona do jednego człowieka — więc
 * i te same trzy rzeczy pod ręką: wejście na kartę dokumentu, podgląd PDF-a
 * (tego samego, który dostaje najemca) i odhaczenie wpłaty. Wcześniej wiersz
 * był samym napisem, przez co rozliczenie najemcy zaczynało się od szukania
 * jego dokumentów na liście wszystkich.
 */
export function TenantInvoiceList({ invoices }: { invoices: TenantInvoiceRow[] }) {
  const { d, locale } = useI18n();
  const t = d.panel.tenantsPage.detail;
  const misc = d.panel.panelMisc;

  return (
    <CardRows>
      {invoices.map((invoice) => (
        <li key={invoice.id} className="flex items-center gap-3 py-3">
          <Link
            href={`/panel/finanse/${invoice.id}`}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-btn transition-opacity hover:opacity-80 sm:flex-nowrap"
          >
            <span className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <span className="block font-mono text-sm font-semibold break-all text-fg sm:truncate">
                {hasRegisterNumber(invoice.number) ? invoice.number : d.panel.invoices.draftNumber}
              </span>
              <span className="block text-[13px] text-muted">
                {fill(misc.dueOn, { date: formatDateIn(invoice.dueDate, locale, "short") })}
              </span>
            </span>
            <InvoiceStatusBadge status={invoice.displayStatus} d={d} />
            <span
              className={`ml-auto shrink-0 text-right font-mono text-sm font-semibold whitespace-nowrap sm:ml-0 sm:w-28 ${
                invoice.displayStatus === "OVERDUE" ? "text-bad" : "text-fg"
              }`}
            >
              {formatMoney(invoice.totalGrossGrosze, locale)}
            </span>
          </Link>

          {/* Poza odnośnikiem: przycisk w środku `<a>` byłby nieprawidłowym
              zagnieżdżeniem, a klik w niego wchodziłby na kartę dokumentu. */}
          <span className="flex shrink-0 items-center gap-1">
            {/* PDF otwiera się w nowej karcie — wracanie „wstecz" z widoku
                dokumentu gubiłoby miejsce w kartotece. */}
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              title={fill(t.previewInvoiceAria, { number: invoice.number })}
              aria-label={fill(t.previewInvoiceAria, { number: invoice.number })}
              className="flex size-8 items-center justify-center rounded-btn text-subtle transition-colors hover:bg-surface-alt hover:text-fg"
            >
              <Eye className="size-[18px]" aria-hidden />
            </a>

            {isPayable(invoice) ? (
              <MarkPaid invoiceId={invoice.id} remainingGrosze={invoice.remainingGrosze} />
            ) : null}
          </span>
        </li>
      ))}
    </CardRows>
  );
}

function isPayable(invoice: TenantInvoiceRow): boolean {
  return (
    invoice.remainingGrosze > 0 &&
    invoice.displayStatus !== "DRAFT" &&
    invoice.displayStatus !== "CANCELLED"
  );
}

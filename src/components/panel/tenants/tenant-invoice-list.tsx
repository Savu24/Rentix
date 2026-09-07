"use client";

import { Eye } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkPaid } from "@/components/panel/invoices/mark-paid";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { INVOICE_STATUS_TONE, type DisplayInvoiceStatus } from "@/lib/invoices/status";
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
    <Card>
      <CardContent className="flex flex-col p-0">
        {invoices.map((invoice, index) => (
          <div
            key={invoice.id}
            className={`flex items-center gap-x-3 px-4 py-3 ${
              index > 0 ? "border-t border-border" : ""
            }`}
          >
            <Link
              href={`/panel/finanse/${invoice.id}`}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-btn transition-opacity hover:opacity-80"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{invoice.number}</p>
                <p className="text-xs text-muted">
                  {fill(misc.dueOn, { date: formatDateIn(invoice.dueDate, locale, "short") })}
                </p>
              </div>
              <Badge tone={INVOICE_STATUS_TONE[invoice.displayStatus]}>
                {d.panel.invoices.status[invoice.displayStatus]}
              </Badge>
              <p className="tabular w-24 text-right font-mono text-sm text-fg">
                {formatMoney(invoice.totalGrossGrosze, locale)}
              </p>
            </Link>

            {/* Poza odnośnikiem: przycisk w środku `<a>` byłby nieprawidłowym
                zagnieżdżeniem, a klik w niego wchodziłby na kartę dokumentu. */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* PDF otwiera się w nowej karcie — wracanie „wstecz" z widoku
                  dokumentu gubiłoby miejsce w kartotece. */}
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                title={fill(t.previewInvoiceAria, { number: invoice.number })}
                aria-label={fill(t.previewInvoiceAria, { number: invoice.number })}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-muted hover:text-fg"
              >
                <Eye className="h-4 w-4" aria-hidden />
              </a>

              {isPayable(invoice) ? (
                <MarkPaid invoiceId={invoice.id} remainingGrosze={invoice.remainingGrosze} />
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Czy dokument czeka jeszcze na pieniądze — tylko wtedy odhaczanie ma sens. */
function isPayable(invoice: TenantInvoiceRow): boolean {
  return (
    invoice.remainingGrosze > 0 &&
    invoice.displayStatus !== "DRAFT" &&
    invoice.displayStatus !== "CANCELLED"
  );
}

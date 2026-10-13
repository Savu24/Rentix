"use client";

import { CheckSquare, Download, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MarkPaid } from "@/components/panel/invoices/mark-paid";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { Button } from "@/components/ui/button";
import type { InvoiceKind } from "@/generated/prisma/enums";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { hasRegisterNumber } from "@/lib/invoices/draft";
import type { DisplayInvoiceStatus } from "@/lib/invoices/status";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { invoiceKindLabels } from "@/lib/validations/invoice";

export type InvoiceRow = {
  id: string;
  number: string;
  kind: InvoiceKind;
  displayStatus: DisplayInvoiceStatus;
  buyerName: string;
  dueDate: Date;
  totalGrossGrosze: number;
  remainingGrosze: number;
  propertyName: string | null;
  roomName: string | null;
};

/** Kolumny tabeli — te same dla nagłówka i wierszy. */
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)_96px_minmax(0,1fr)_132px] lg:items-center lg:gap-4";

/**
 * Lista dokumentów (redesign/13-finanse-dokumenty-*.svg): tabela na
 * desktopie, wiersze na telefonie. Tryb zaznaczania pobiera PDF-y hurtem —
 * pasek akcji pływa nad listą, żeby nie trzeba było wracać na górę.
 */
export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage;
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Jedna chwila na całą listę — dni do terminu liczone od tego samego „teraz".
  const now = useMemo(() => new Date(), []);

  const allSelected = invoices.length > 0 && selected.size === invoices.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(invoices.map((invoice) => invoice.id)));
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {!selecting ? (
          <Button size="sm" variant="ghost" onClick={() => setSelecting(true)}>
            <CheckSquare className="size-4" aria-hidden />
            {t.selectForDownload}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={exitSelecting}>
            <X className="size-4" aria-hidden />
            {t.finishSelecting}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-tile border border-border bg-surface lg:rounded-card">
        <div className="hidden h-10 items-center gap-3 border-b border-border bg-hover pr-6 text-[12.5px] font-[550] text-muted lg:flex">
          <div className={cn(COLUMNS, "flex-1 pl-6")}>
            <span className="flex items-center gap-3">
              {selecting ? (
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? t.deselectAll : t.selectAll}
                  className="size-[18px] accent-[var(--primary)]"
                />
              ) : null}
              {t.table.document}
            </span>
            <span>{t.table.buyer}</span>
            <span>{t.table.due}</span>
            <span>{t.table.status}</span>
            <span className="text-right">{t.table.amount}</span>
          </div>
          <span className="w-8 shrink-0" />
        </div>

        <ul>
          {invoices.map((invoice) => {
            const isSelected = selected.has(invoice.id);
            const overdue = invoice.displayStatus === "OVERDUE";
            const partial =
              invoice.remainingGrosze > 0 && invoice.remainingGrosze !== invoice.totalGrossGrosze;
            const draft = invoice.displayStatus === "DRAFT";
            const place = invoice.propertyName
              ? `${invoice.propertyName}${invoice.roomName ? `, ${invoice.roomName}` : ""}`
              : null;
            const number = hasRegisterNumber(invoice.number) ? invoice.number : d.panel.invoices.draftNumber;

            const content = (
              <>
                <span className="flex min-w-0 items-start gap-3">
                  {selecting ? (
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border",
                        isSelected ? "border-accent bg-accent text-accent-contrast" : "border-border-strong bg-surface",
                      )}
                    >
                      {isSelected ? <CheckSquare className="size-3" /> : null}
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className={cn("block font-mono text-sm font-semibold", draft ? "text-muted" : "text-fg")}>
                      {number}
                    </span>
                    <span className="hidden text-[13px] text-muted lg:block">
                      {invoiceKindLabels(d)[invoice.kind]}
                    </span>
                    {/* Telefon: nabywca w drugiej linii. */}
                    <span className="block truncate text-[13px] text-muted lg:hidden">
                      {invoice.buyerName}
                    </span>
                  </span>
                </span>

                <span className="hidden min-w-0 lg:block">
                  <span className="block truncate text-sm font-medium text-fg">{invoice.buyerName}</span>
                  {place ? <span className="block truncate text-[13px] text-muted">{place}</span> : null}
                </span>

                <span
                  className={cn(
                    "hidden font-mono text-sm lg:block",
                    overdue ? "font-[550] text-bad" : "text-muted",
                  )}
                >
                  {formatDateIn(invoice.dueDate, locale, "short")}
                </span>

                <span className="hidden lg:block">
                  <InvoiceStatusBadge
                    status={invoice.displayStatus}
                    d={d}
                    due={{ date: invoice.dueDate, now, locale }}
                  />
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span
                    className={cn(
                      "font-mono text-[14.5px] font-semibold whitespace-nowrap",
                      overdue ? "text-bad" : draft ? "text-muted" : "text-fg",
                    )}
                  >
                    {formatMoney(partial ? invoice.remainingGrosze : invoice.totalGrossGrosze, locale)}
                  </span>
                  {partial ? (
                    <span className="hidden font-mono text-[12.5px] whitespace-nowrap text-muted lg:block">
                      {fill(t.remainingAmount, { amount: formatMoney(invoice.remainingGrosze, locale) })}
                    </span>
                  ) : null}
                  <span className="lg:hidden">
                    <InvoiceStatusBadge
                      status={invoice.displayStatus}
                      d={d}
                      size="sm"
                      due={{ date: invoice.dueDate, now, locale }}
                    />
                  </span>
                </span>
              </>
            );

            const rowClass = cn(
              COLUMNS,
              "flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 text-left lg:min-h-16 lg:pl-6",
            );

            return (
              <li
                key={invoice.id}
                className={cn(
                  "flex items-center gap-3 border-t border-border pr-4 transition-colors first:border-t-0 lg:pr-6",
                  isSelected ? "bg-accent-soft" : "hover:bg-hover",
                )}
              >
                {selecting ? (
                  <button
                    type="button"
                    onClick={() => toggle(invoice.id)}
                    aria-pressed={isSelected}
                    className={rowClass}
                  >
                    {content}
                  </button>
                ) : (
                  <Link href={`/panel/finanse/${invoice.id}`} className={rowClass}>
                    {content}
                  </Link>
                )}
                {/* Szybka wpłata poza odnośnikiem — przycisk w środku `<a>` byłby
                    nieprawidłowym zagnieżdżeniem, a klik wchodziłby na kartę. */}
                <span className="flex w-8 shrink-0 justify-end">
                  {!selecting && isPayable(invoice) ? (
                    <MarkPaid invoiceId={invoice.id} remainingGrosze={invoice.remainingGrosze} />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pływający pasek pobierania: liczba, zaznacz wszystkie, pobierz. */}
      {selecting ? (
        <div className="sticky bottom-24 z-20 mx-auto flex w-full max-w-[520px] flex-wrap items-center gap-3 rounded-card bg-fg px-4 py-2.5 text-bg shadow-float lg:bottom-6">
          <span className="text-sm font-semibold" aria-live="polite">
            {selected.size === 0
              ? t.nothingSelected
              : `${selected.size} ${pluralize(locale, selected.size, t.documentNoun)}`}
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm font-medium text-subtle transition-colors hover:text-bg"
          >
            {allSelected ? t.deselectAll : t.selectAll}
          </button>
          <span className="ml-auto">
            {selected.size > 0 ? (
              <Button asChild size="sm" variant="highlight">
                <a href={`/api/invoices/pdf?ids=${[...selected].join(",")}`}>
                  <Download className="size-4" aria-hidden />
                  {fill(t.downloadCount, {
                    count: selected.size,
                    noun: pluralize(locale, selected.size, t.documentNoun),
                  })}
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="highlight" disabled>
                <Download className="size-4" aria-hidden />
                {t.download}
              </Button>
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function isPayable(invoice: InvoiceRow): boolean {
  return (
    invoice.remainingGrosze > 0 &&
    invoice.displayStatus !== "DRAFT" &&
    invoice.displayStatus !== "CANCELLED"
  );
}

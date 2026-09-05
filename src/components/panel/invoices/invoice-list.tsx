"use client";

import { Check, CheckSquare, Download, Loader2, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import { INVOICE_STATUS_TONE, type DisplayInvoiceStatus } from "@/lib/invoices/status";
import { formatAmount, formatMoney } from "@/lib/money";

export type InvoiceRow = {
  id: string;
  number: string;
  displayStatus: DisplayInvoiceStatus;
  buyerName: string;
  dueDate: Date;
  totalGrossGrosze: number;
  remainingGrosze: number;
  propertyName: string | null;
  roomName: string | null;
};

/**
 * Lista dokumentów z trybem zaznaczania.
 *
 * Pola wyboru pojawiają się dopiero po włączeniu trybu, a nie stoją przy każdym
 * wierszu na stałe: codzienne użycie tej listy to „wejdź i zobacz", a stała
 * kolumna checkboxów kazałaby omijać ją wzrokiem przy każdym wejściu.
 *
 * W trybie zaznaczania wiersz przestaje być odnośnikiem — kliknięcie zaznacza.
 * Inaczej trafienie obok pola wyboru wyrzucałoby ze strony w środku
 * kompletowania paczki.
 */
export function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage;
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      {!selecting ? (
        <div>
          <Button size="sm" variant="secondary" onClick={() => setSelecting(true)}>
            <CheckSquare className="h-4 w-4" aria-hidden />
            {t.selectForDownload}
          </Button>
        </div>
      ) : (
        // Pasek trzyma się przy górnej krawędzi, bo przy długiej liście
        // przycisk pobierania uciekłby poza ekran razem z przewijaniem.
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2.5 rounded-control border border-accent/40 bg-surface px-3 py-2.5 shadow-sm">
          <Button size="sm" variant="ghost" onClick={toggleAll}>
            {allSelected ? (
              <Square className="h-4 w-4" aria-hidden />
            ) : (
              <CheckSquare className="h-4 w-4" aria-hidden />
            )}
            {allSelected ? t.deselectAll : t.selectAll}
          </Button>

          <span className="text-xs text-muted" aria-live="polite">
            {selected.size === 0
              ? t.nothingSelected
              : fill(pluralize(locale, selected.size, t.unpaidDocs), {
                  count: selected.size,
                })}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 ? (
              <Button asChild size="sm">
                <a href={`/api/invoices/pdf?ids=${[...selected].join(",")}`}>
                  <Download className="h-4 w-4" aria-hidden />
                  {fill(t.downloadCount, {
                    count: selected.size,
                    noun: pluralize(locale, selected.size, t.documentNoun),
                  })}
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled>
                <Download className="h-4 w-4" aria-hidden />
                {t.download}
              </Button>
            )}

            <Button size="sm" variant="ghost" onClick={exitSelecting} aria-label={t.finishSelecting}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {invoices.map((invoice) => {
          const tone = INVOICE_STATUS_TONE[invoice.displayStatus];
          const isSelected = selected.has(invoice.id);

          const body = (
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              {selecting ? (
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                    isSelected ? "border-accent bg-accent text-accent-contrast" : "border-border"
                  }`}
                >
                  {isSelected ? <CheckSquare className="h-3 w-3" /> : null}
                </span>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-fg">{invoice.number}</p>
                  <Badge tone={tone}>{d.panel.invoices.status[invoice.displayStatus]}</Badge>
                </div>

                <p className="mt-0.5 text-sm font-medium text-fg">{invoice.buyerName}</p>

                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  {invoice.propertyName ? (
                    <span>
                      {invoice.propertyName}
                      {invoice.roomName ? ` · ${invoice.roomName}` : ""}
                    </span>
                  ) : null}
                  <span>{fill(t.dueOn, { date: formatDateIn(invoice.dueDate, locale, "short") })}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="tabular font-mono text-sm font-medium text-fg">
                  {formatMoney(invoice.totalGrossGrosze, locale)}
                </p>
                {invoice.remainingGrosze > 0 &&
                invoice.remainingGrosze !== invoice.totalGrossGrosze ? (
                  <p className="text-xs text-muted">
                    {fill(t.remainingAmount, {
                      amount: formatMoney(invoice.remainingGrosze, locale),
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          );

          return (
            <Card
              key={invoice.id}
              className={`flex items-stretch transition-colors ${
                isSelected ? "border-accent bg-accent-soft/30" : "hover:border-muted"
              }`}
            >
              {selecting ? (
                <button
                  type="button"
                  onClick={() => toggle(invoice.id)}
                  aria-pressed={isSelected}
                  className="block w-full min-w-0 flex-1 rounded-card text-left"
                >
                  {body}
                </button>
              ) : (
                <Link
                  href={`/panel/finanse/${invoice.id}`}
                  className="block min-w-0 flex-1 rounded-card"
                >
                  {body}
                </Link>
              )}

              {/* Poza odnośnikiem — przycisk w środku `<a>` byłby nieprawidłowym
                  zagnieżdżeniem, a klik w niego wchodziłby na kartę dokumentu. */}
              {!selecting && isPayable(invoice) ? (
                <div className="flex items-center pr-4">
                  <MarkPaid invoiceId={invoice.id} remainingGrosze={invoice.remainingGrosze} />
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Czy dokument czeka jeszcze na pieniądze — tylko wtedy odhaczanie ma sens. */
function isPayable(invoice: InvoiceRow): boolean {
  return (
    invoice.remainingGrosze > 0 &&
    invoice.displayStatus !== "DRAFT" &&
    invoice.displayStatus !== "CANCELLED"
  );
}

/**
 * Odhaczenie wpłaty prosto z listy.
 *
 * Zapisuje całą brakującą kwotę przelewem z dzisiejszą datą — to przypadek,
 * który przy przeglądaniu listy zdarza się najczęściej. Nietypowa wpłata
 * (część kwoty, gotówka, inna data) zostaje na karcie dokumentu.
 *
 * Bez potwierdzenia: pomyłkę usuwa się jednym kliknięciem przy wpłacie
 * na karcie dokumentu, a dodatkowy krok kosztowałby przy każdym wierszu.
 */
function MarkPaid({ invoiceId, remainingGrosze }: { invoiceId: string; remainingGrosze: number }) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);

    const result = await api.post(`/api/invoices/${invoiceId}/payments`, {
      amountGrosze: formatAmount(remainingGrosze, locale),
      paidAt: new Date().toISOString().slice(0, 10),
      method: "TRANSFER",
      reference: "",
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  const label = fill(d.panel.financePage.markPaid, {
    amount: formatMoney(remainingGrosze, locale),
  });

  return (
    <button
      type="button"
      onClick={pay}
      disabled={busy}
      title={error ?? label}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
        error
          ? "border-bad text-bad"
          : "border-border text-muted hover:border-good hover:bg-good-soft hover:text-good"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

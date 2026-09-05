"use client";

import { Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_META } from "@/lib/i18n/config";
import { fill, pluralize } from "@/lib/i18n/format";

/**
 * Numery miesięcy, nie nazwy — te bierze `Intl` w języku konta. Lista nazw
 * w kodzie byłaby czwartym miejscem, w którym trzymamy polski kalendarz.
 */
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

type GenerateResponse = {
  created: Array<{ leaseId: string; invoiceId: string; number: string }>;
  skipped: Array<{ leaseId: string; reason: string }>;
};

/**
 * Ręczne naliczenie czynszu za wybrany miesiąc.
 *
 * To samo wywołanie, które co noc odpala cron — przycisk istnieje po to, żeby
 * uzupełnić zaległy miesiąc albo naliczyć wcześniej. Operacja jest
 * idempotentna, więc powtórne kliknięcie nie wystawi drugiego rachunku.
 */
export function GenerateInvoices({
  leaseId,
  tenantId,
  label,
}: {
  /** Ustawione = naliczamy tylko tę umowę. */
  leaseId?: string;
  /** Ustawione = naliczamy wszystkie aktywne umowy tego najemcy. */
  tenantId?: string;
  /** Bez obu = wszystkie aktywne umowy organizacji. */
  label?: string;
}) {
  const router = useRouter();
  const now = new Date();

  const { d, locale } = useI18n();
  const t = d.panel.financePage.generate;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);

    const response = await api.post<GenerateResponse>("/api/invoices/generate", {
      year,
      month,
      leaseId: leaseId ?? "",
      tenantId: tenantId ?? "",
    });

    setBusy(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setResult(response.data);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Receipt className="h-4 w-4" aria-hidden />
        {label ?? t.button}
      </Button>
    );
  }

  // Rok bieżący i dwa wstecz — starsze okresy nalicza się wyjątkowo, a długa
  // lista lat tylko utrudnia trafienie w ten właściwy.
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <Card className="border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">{t.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {leaseId || tenantId ? t.leadTenant : t.leadAll} {t.alsoSkipped}
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {result ? (
          <Alert tone={result.created.length > 0 ? "success" : "info"}>
            {result.created.length > 0 ? (
              <>
                {fill(t.issued, {
                  count: result.created.length,
                  noun: pluralize(locale, result.created.length, d.panel.financePage.documentNoun),
                  numbers: result.created.map((invoice) => invoice.number).join(", "),
                })}
              </>
            ) : (
              t.nothingIssued
            )}
            {result.skipped.length > 0 ? (
              <span className="mt-1 block text-muted">
                {fill(t.skipped, {
                  count: result.skipped.length,
                  noun: pluralize(locale, result.skipped.length, d.panel.leasesPage.noun),
                  reasons: [
                    ...new Set(
                      result.skipped.map(
                        (entry) =>
                          t.skipReason[entry.reason as keyof typeof t.skipReason] ?? entry.reason,
                      ),
                    ),
                  ].join("; "),
                })}
              </span>
            ) : null}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="generate-month" label={t.month}>
            <Select
              id="generate-month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              disabled={busy}
            >
              {MONTHS.map((index) => (
                <option key={index} value={index + 1}>
                  {new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: "long" }).format(
                    new Date(Date.UTC(2026, index, 1)),
                  )}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="generate-year" label={t.year}>
            <Select
              id="generate-year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              disabled={busy}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t.run}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOpen(false);
              setResult(null);
              setError(null);
            }}
            disabled={busy}
          >
            {t.close}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

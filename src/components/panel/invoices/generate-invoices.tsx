"use client";

import { Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_META } from "@/lib/i18n/config";

/**
 * Numery miesięcy, nie nazwy — te bierze `Intl` w języku konta. Lista nazw
 * w kodzie byłaby czwartym miejscem, w którym trzymamy polski kalendarz.
 */
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Intl podaje polskie miesiące małą literą — na liście wyboru stoją same. */
function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

type GenerateResponse = {
  created: Array<{ leaseId: string; invoiceId: string; number: string; draft: boolean }>;
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
  variant = "secondary",
}: {
  /** Ustawione = naliczamy tylko tę umowę. */
  leaseId?: string;
  /** Ustawione = naliczamy wszystkie aktywne umowy tego najemcy. */
  tenantId?: string;
  /** Bez obu = wszystkie aktywne umowy organizacji. */
  label?: string;
  /** Główna akcja ekranu Finanse — w karcie najemcy drugorzędna. */
  variant?: "primary" | "secondary";
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

  const issued = result?.created.filter((invoice) => !invoice.draft) ?? [];
  const drafts = result?.created.filter((invoice) => invoice.draft) ?? [];

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  return (
    <>
      <Button size={variant === "primary" ? "md" : "sm"} variant={variant} onClick={() => setOpen(true)}>
        <Receipt className={variant === "primary" ? "size-[18px]" : "size-4"} aria-hidden />
        {label ?? t.button}
      </Button>

      <Dialog open={open} onClose={close} title={t.title} closeLabel={t.close} className="sm:max-w-[460px]">
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}

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
                    {capitalize(
                      new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: "long" }).format(
                        new Date(Date.UTC(2026, index, 1)),
                      ),
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

          {/* Wynik naliczenia jako trzy liczby zamiast zdania
              (redesign/15-nalicz-czynsz-modal.svg). */}
          {result ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
                {[
                  { label: t.resultIssued, count: issued.length, tone: "text-good" },
                  { label: t.resultDrafts, count: drafts.length, tone: "text-info" },
                  { label: t.resultSkipped, count: result.skipped.length, tone: "text-muted" },
                ].map((cell, index) => (
                  <div
                    key={cell.label}
                    className={`flex flex-col gap-1 px-4 py-3 ${index > 0 ? "border-l border-border" : ""}`}
                  >
                    <dt className="text-[12.5px] font-medium text-subtle">{cell.label}</dt>
                    <dd className={`font-mono text-2xl font-[650] ${cell.tone}`}>{cell.count}</dd>
                  </div>
                ))}
              </dl>
              {issued.length > 0 ? (
                <p className="font-mono text-[13px] text-muted">
                  {issued.map((invoice) => invoice.number).join(", ")}
                </p>
              ) : null}
              {result.skipped.length > 0 ? (
                <p className="text-[13px] text-muted">
                  {[
                    ...new Set(
                      result.skipped.map(
                        (entry) => t.skipReason[entry.reason as keyof typeof t.skipReason] ?? entry.reason,
                      ),
                    ),
                  ].join("; ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t.close}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Receipt className="size-[18px]" aria-hidden />
            )}
            {t.run}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

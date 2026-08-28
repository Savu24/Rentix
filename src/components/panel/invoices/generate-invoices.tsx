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
import { plural } from "@/lib/utils";

const MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

type GenerateResponse = {
  created: Array<{ leaseId: string; invoiceId: string; number: string }>;
  skipped: Array<{ leaseId: string; reason: string }>;
};

const SKIP_REASON_LABEL: Record<string, string> = {
  ALREADY_INVOICED: "miały już dokument za ten okres",
  OUTSIDE_LEASE_PERIOD: "nie obowiązywały w tym miesiącu",
  NO_TENANT: "nie mają przypisanego najemcy",
  NOTHING_TO_BILL: "nie mają czego naliczyć",
  BILLING_DAY_AHEAD: "mają dzień naliczania w przyszłości",
  BEFORE_BILLING_START: "są rozliczane w Rentiksie dopiero od późniejszego miesiąca",
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
  label = "Nalicz czynsz",
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
        {label}
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
          <p className="text-sm font-semibold text-fg">Naliczenie czynszu</p>
          <p className="mt-0.5 text-xs text-muted">
            {leaseId || tenantId
              ? "Wystawi dokumenty za wskazany miesiąc dla aktywnych umów tego najemcy."
              : "Wystawi dokumenty wszystkim aktywnym umowom za wskazany miesiąc."}{" "}
            Umowy, które mają już rozliczenie za ten okres, zostaną pominięte.
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {result ? (
          <Alert tone={result.created.length > 0 ? "success" : "info"}>
            {result.created.length > 0 ? (
              <>
                Wystawiono {result.created.length}{" "}
                {plural(result.created.length, ["dokument", "dokumenty", "dokumentów"])}:{" "}
                {result.created.map((invoice) => invoice.number).join(", ")}.
              </>
            ) : (
              "Nie wystawiono żadnego nowego dokumentu."
            )}
            {result.skipped.length > 0 ? (
              <span className="mt-1 block text-muted">
                Pominięto {result.skipped.length}{" "}
                {plural(result.skipped.length, ["umowę", "umowy", "umów"])} —{" "}
                {[...new Set(result.skipped.map((entry) => SKIP_REASON_LABEL[entry.reason] ?? entry.reason))].join(
                  "; ",
                )}
                .
              </span>
            ) : null}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="generate-month" label="Miesiąc">
            <Select
              id="generate-month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              disabled={busy}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="generate-year" label="Rok">
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
            Nalicz
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
            Zamknij
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

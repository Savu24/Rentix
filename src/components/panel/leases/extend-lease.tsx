"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { api } from "@/lib/api/client";
import { addMonthsUtc } from "@/lib/leases/expiry";

/** Okresy, na które przedłuża się umowę najmu w praktyce. */
const PRESETS = [
  { months: 3, label: "o 3 miesiące" },
  { months: 6, label: "o pół roku" },
  { months: 12, label: "o rok" },
] as const;

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

const toInputValue = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Przedłużenie umowy.
 *
 * Osobno od pełnej edycji, bo to jedyna zmiana, którą właściciel robi
 * regularnie i pod presją czasu — licznik „14 dni do końca umowy" ma prowadzić
 * do jednego kliknięcia, a nie do formularza z dwunastoma polami, w którym
 * trzeba odszukać właściwą datę.
 *
 * Liczymy od dotychczasowego końca, nie od dzisiaj: aneks przedłuża okres
 * najmu, więc „o rok" znaczy rok od dnia, w którym umowa miała się skończyć.
 * Wynikowa data stoi na każdym przycisku, żeby nie trzeba było jej zgadywać.
 */
export function ExtendLease({
  leaseId,
  endDate,
}: {
  leaseId: string;
  /** Dotychczasowa data zakończenia, RRRR-MM-DD. */
  endDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = new Date(`${endDate}T00:00:00.000Z`);

  async function extend(next: string, key: string) {
    setError(null);
    setBusy(key);

    const result = await api.patch(`/api/leases/${leaseId}`, { endDate: next });
    setBusy(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    setCustom("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Przedłuż umowę
      </Button>
    );
  }

  return (
    <Card className="w-full border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-fg">Przedłużenie umowy</p>
          <p className="text-xs text-muted">
            Obecnie do {dateFormat.format(current)}. Zmienia się wyłącznie data zakończenia —
            czynsz i pozostałe warunki zostają.
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map(({ months, label }) => {
            const next = addMonthsUtc(current, months);
            const key = `p${months}`;

            return (
              <Button
                key={key}
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => extend(toInputValue(next), key)}
              >
                {busy === key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {label} · do {dateFormat.format(next)}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2.5 border-t border-border pt-4">
          <FormField id="extend-endDate" label="Albo własna data" className="min-w-[12rem]">
            <DateInput
              id="extend-endDate"
              min={endDate}
              value={custom}
              disabled={busy !== null}
              onChange={(event) => setCustom(event.target.value)}
            />
          </FormField>

          <Button
            size="sm"
            disabled={busy !== null || custom === ""}
            onClick={() => extend(custom, "custom")}
          >
            {busy === "custom" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

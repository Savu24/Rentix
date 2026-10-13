"use client";

import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { addMonthsUtc } from "@/lib/leases/expiry";
import { cn } from "@/lib/utils";

const PRESETS = [
  { months: 3, key: "months3" as const },
  { months: 6, key: "months6" as const },
  { months: 12, key: "months12" as const },
] as const;

const toInputValue = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Przedłużenie umowy (redesign/11-umowa-przedluzenie-modal.svg).
 *
 * Trzy gotowe odcinki jako karty wyboru albo własna data. Zmienia się
 * wyłącznie data zakończenia — czynsz i pozostałe warunki zostają, więc
 * okno nie pyta o nic więcej. Nowa data liczy się „ten sam dzień miesiąca"
 * (`addMonthsUtc`), bo aneks pisze się datami, a nie liczbą dni.
 */
export function ExtendLease({
  leaseId,
  endDate,
  variant = "primary",
}: {
  leaseId: string;
  endDate: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const t = d.panel.leasesPage.extend;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("p12");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = new Date(`${endDate}T00:00:00.000Z`);
  const options = PRESETS.map(({ months, key }) => ({
    id: `p${months}`,
    label: t.presets[key],
    value: toInputValue(addMonthsUtc(current, months)),
  }));
  const target = choice === "custom" ? custom : (options.find((option) => option.id === choice)?.value ?? "");

  async function extend() {
    if (!target) return;
    setError(null);
    setBusy(true);

    const result = await api.patch(`/api/leases/${leaseId}`, { endDate: target });
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    setCustom("");
    router.refresh();
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <CalendarPlus className="size-[18px]" aria-hidden />
        {t.button}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.button}
        closeLabel={d.panel.common.close}
      >
        <DialogBody>
          <p className="text-sm text-muted">
            {fill(t.current, { date: formatDateIn(current, locale, "short") })}
          </p>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <div role="radiogroup" aria-label={t.button} className="flex flex-col gap-2">
            {options.map((option) => {
              const selected = choice === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => setChoice(option.id)}
                  className={cn(
                    "flex h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors",
                    selected
                      ? "border-accent bg-accent-soft ring-1 ring-accent"
                      : "border-border-strong bg-surface hover:bg-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-accent" : "border-border-strong",
                    )}
                    aria-hidden
                  >
                    {selected ? <span className="size-2.5 rounded-full bg-accent" /> : null}
                  </span>
                  <span className="flex-1 text-[14.5px] font-semibold text-fg">{option.label}</span>
                  <span
                    className={cn(
                      "font-mono text-sm whitespace-nowrap",
                      selected ? "font-semibold text-accent" : "text-muted",
                    )}
                  >
                    {fill(t.until, { date: formatDateIn(new Date(option.value), locale, "short") })}
                  </span>
                </button>
              );
            })}
          </div>

          <FormField id="extend-endDate" label={t.customDate} className="sm:max-w-60">
            <DateInput
              id="extend-endDate"
              min={endDate}
              value={custom}
              disabled={busy}
              onChange={(event) => {
                setCustom(event.target.value);
                setChoice(event.target.value ? "custom" : "p12");
              }}
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button onClick={extend} disabled={busy || !target}>
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Check className="size-[18px]" aria-hidden />
            )}
            {target
              ? fill(t.submit, { date: formatDateIn(new Date(target), locale, "short") })
              : t.button}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

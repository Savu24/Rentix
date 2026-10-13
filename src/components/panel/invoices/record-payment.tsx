"use client";

import { Banknote, Check, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { formatAmount, formatMoneyParts, parseMoney } from "@/lib/money";
import { paymentMethodLabels } from "@/lib/validations/invoice";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Zapis wpłaty do dokumentu (redesign/14-wplata-modal.svg).
 *
 * Kwota podpowiada się jako pozostała do zapłaty — najczęstszy przypadek to
 * przelew na całą brakującą sumę, a ręczne przepisywanie kwoty to okazja
 * do literówki. Pod polami okno mówi, czy wpisana kwota zamyka dokument.
 *
 * `trigger="link"` — ta sama akcja jako tekstowy link w karcie „Pozostaje".
 */
export function RecordPayment({
  invoiceId,
  remainingGrosze,
  description,
  trigger = "button",
  className,
}: {
  invoiceId: string;
  remainingGrosze: number;
  /** Linia pod tytułem okna: numer dokumentu i nabywca. */
  description?: string;
  trigger?: "button" | "link";
  className?: string;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.payment;
  const router = useRouter();
  const { currency } = formatMoneyParts(0, locale);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(() => formatAmount(remainingGrosze, locale));
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("TRANSFER");
  const [reference, setReference] = useState("");

  const parsed = parseMoney(amount, locale);
  const coversAll = parsed !== null && parsed >= remainingGrosze;

  function openDialog() {
    // Każde otwarcie zaczyna od pełnej brakującej kwoty — po częściowej
    // wpłacie i odświeżeniu strony stara kwota w polu byłaby nieaktualna.
    setAmount(formatAmount(remainingGrosze, locale));
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await api.post(`/api/invoices/${invoiceId}/payments`, {
      amountGrosze: amount,
      paidAt,
      method,
      reference,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.fields?.amountGrosze?.[0] ?? result.message);
      return;
    }

    setOpen(false);
    setReference("");
    router.refresh();
  }

  return (
    <>
      {trigger === "link" ? (
        <button
          type="button"
          onClick={openDialog}
          className={cn("rounded-btn text-[13.5px] font-semibold text-accent hover:underline", className)}
        >
          {t.add}
        </button>
      ) : (
        <Button className={className} onClick={openDialog}>
          <Banknote className="size-[18px]" aria-hidden />
          {t.add}
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.title}
        description={description}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[520px]"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogBody>
            {error ? <Alert tone="error">{error}</Alert> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="payment-amount" label={t.amount}>
                <div className="relative">
                  <Input
                    id="payment-amount"
                    inputMode="decimal"
                    className="pr-10 font-mono"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={busy}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
                    {currency}
                  </span>
                </div>
              </FormField>

              <FormField id="payment-date" label={t.paidAt}>
                <DateInput
                  id="payment-date"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  disabled={busy}
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-1">
              <Label id="payment-method-label">{t.method}</Label>
              <div
                role="radiogroup"
                aria-labelledby="payment-method-label"
                className="flex flex-wrap gap-1 rounded-[9px] bg-surface-alt p-[3px] sm:w-fit"
              >
                {Object.entries(paymentMethodLabels(d)).map(([value, label]) => {
                  const active = value === method;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={busy}
                      onClick={() => setMethod(value)}
                      className={cn(
                        "h-[30px] rounded-[7px] px-3 text-[13px] font-[550] whitespace-nowrap transition-colors",
                        active ? "bg-surface text-fg shadow-btn" : "text-muted hover:text-fg",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField id="payment-reference" label={t.reference}>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                disabled={busy}
              />
            </FormField>

            {coversAll ? (
              <p className="flex h-10 items-center gap-2.5 rounded-alert bg-good-soft px-3.5 text-sm font-[550] text-good-ink">
                <CheckCircle2 className="size-[18px] shrink-0 text-good" strokeWidth={1.9} aria-hidden />
                {t.coversAll}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {d.panel.common.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <Check className="size-[18px]" aria-hidden />
              )}
              {t.add}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

/**
 * Usunięcie wpłaty wpisanej przez pomyłkę.
 *
 * Bez potwierdzenia w osobnym oknie — `confirm()` blokuje wątek przeglądarki,
 * a operacja jest odwracalna wpisaniem wpłaty jeszcze raz. Zamiast tego
 * przycisk zmienia się w parę „na pewno / anuluj".
 */
export function DeletePayment({ paymentId }: { paymentId: string }) {
  const { d } = useI18n();
  const t = d.panel.financePage.payment;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await api.delete(`/api/payments/${paymentId}`);
    setBusy(false);

    if (result.ok) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 hover:text-bad"
        onClick={() => setConfirming(true)}
        aria-label={t.remove}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {d.panel.common.delete}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
        {d.panel.common.cancel}
      </Button>
    </span>
  );
}

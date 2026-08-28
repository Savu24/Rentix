"use client";

import { Banknote, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { formatAmount } from "@/lib/money";
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/invoice";

/**
 * Zapis wpłaty do dokumentu.
 *
 * Kwota podpowiada się jako pozostała do zapłaty — najczęstszy przypadek to
 * przelew na całą brakującą sumę, a ręczne przepisywanie kwoty to okazja
 * do literówki.
 */
export function RecordPayment({
  invoiceId,
  remainingGrosze,
}: {
  invoiceId: string;
  remainingGrosze: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(() => formatAmount(remainingGrosze));
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("TRANSFER");
  const [reference, setReference] = useState("");

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

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Banknote className="h-4 w-4" aria-hidden />
        Zapisz wpłatę
      </Button>
    );
  }

  return (
    <Card className="border-accent/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <p className="text-sm font-semibold text-fg">Nowa wpłata</p>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="payment-amount" label="Kwota">
            <Input
              id="payment-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField id="payment-date" label="Data wpłaty">
            <Input
              id="payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField id="payment-method" label="Forma">
            <Select
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              disabled={busy}
            >
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          id="payment-reference"
          label="Tytuł przelewu"
          hint="Opcjonalny — ułatwia uzgodnienie z wyciągiem bankowym."
        >
          <Input
            id="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            disabled={busy}
          />
        </FormField>

        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz wpłatę
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Usuń wpłatę"
        className="rounded-btn p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-bad"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        Usuń
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Anuluj
      </Button>
    </span>
  );
}

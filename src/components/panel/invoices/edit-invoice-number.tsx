"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Poprawka numeru wystawionego dokumentu.
 *
 * Widoczna tylko tam, gdzie pozwala na to `renumber.ts` — o tym rozstrzyga
 * strona, a nie ten komponent. Ukryty przycisk nie jest zabezpieczeniem, więc
 * te same dwa warunki sprawdza jeszcze raz endpoint.
 *
 * Kolizję numeru i zamknięty dokument opisuje serwer, bo to on zna rejestr;
 * komunikat idzie wprost do użytkownika zamiast być tłumaczony po raz drugi.
 */
export function EditInvoiceNumber({
  invoiceId,
  number,
}: {
  invoiceId: string;
  number: string;
}) {
  const { d } = useI18n();
  const t = d.panel.panelMisc.editInvoiceNumber;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(number);

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await api.patch(`/api/invoices/${invoiceId}`, { number: value });
    setBusy(false);

    if (!result.ok) {
      setError(result.fields?.number?.[0] ?? result.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {t.button}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <FormField id="invoice-number" label={t.label} hint={t.hint}>
        <Input
          id="invoice-number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
        />
      </FormField>

      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t.save}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            // Wpisany numer wraca do stanu z bazy: porzucona edycja nie może
            // zostawić w polu wartości, która nigdzie nie została zapisana.
            setValue(number);
            setError(null);
            setOpen(false);
          }}
          disabled={busy}
        >
          {d.panel.common.cancel}
        </Button>
      </div>
    </div>
  );
}

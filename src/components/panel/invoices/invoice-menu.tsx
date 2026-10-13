"use client";

import { Ban, Hash, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/panel/action-menu";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField, fieldAria } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/** Dokument w oknach: numer, kwota i nabywca, tak jak w nagłówku karty. */
export type InvoiceSummary = {
  id: string;
  number: string;
  amount: string;
  buyerName: string;
};

/**
 * Menu „⋯" w nagłówku dokumentu: rzadkie akcje — poprawka numeru (tylko
 * tam, gdzie pozwala `renumber.ts`) i anulowanie.
 */
export function InvoiceMenu({
  invoice,
  canEditNumber,
}: {
  invoice: InvoiceSummary;
  canEditNumber: boolean;
}) {
  const { d } = useI18n();
  const [dialog, setDialog] = useState<"number" | "cancel" | null>(null);

  const items: ActionMenuItem[] = [];
  if (canEditNumber) {
    items.push({
      label: d.panel.panelMisc.editInvoiceNumber.button,
      icon: Pencil,
      onSelect: () => setDialog("number"),
    });
  }
  items.push({
    label: d.panel.panelMisc.cancelInvoice.button,
    icon: Ban,
    danger: true,
    onSelect: () => setDialog("cancel"),
  });

  return (
    <>
      <ActionMenu items={items} label={d.panel.financePage.detail.more} size="md" />
      {canEditNumber ? (
        <EditInvoiceNumberDialog
          invoiceId={invoice.id}
          number={invoice.number}
          open={dialog === "number"}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <CancelInvoiceDialog invoice={invoice} open={dialog === "cancel"} onClose={() => setDialog(null)} />
    </>
  );
}

/**
 * Anulowanie dokumentu (redesign/14-wyslij-anuluj-modale.svg).
 *
 * Rekord zostaje w bazie — numer musi pozostać zajęty, żeby rejestr był
 * ciągły; okno mówi to plakietką, nie zdaniem. Dokument z wpłatami odrzuca
 * API, więc komunikat z serwera trafia wprost do użytkownika zamiast być
 * tłumaczony po raz drugi tutaj.
 */
export function CancelInvoiceDialog({
  invoice,
  open,
  onClose,
  title,
  confirmLabel,
  numberStays = true,
}: {
  invoice: InvoiceSummary;
  open: boolean;
  onClose: () => void;
  /** Szkic usuwa się tym samym endpointem, ale pod własną nazwą. */
  title?: string;
  confirmLabel?: string;
  /** Szkic nie ma numeru z rejestru, więc plakietka o numerze nie ma sensu. */
  numberStays?: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.panelMisc.cancelInvoice;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);

    const result = await api.delete(`/api/invoices/${invoice.id}`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? t.title}
      closeLabel={d.panel.common.close}
      className="sm:max-w-[460px]"
    >
      <DialogBody>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <InvoiceSummaryBox invoice={invoice}>
          {numberStays ? (
            <Badge size="sm" tone="outline" icon={Hash}>
              {t.numberStays}
            </Badge>
          ) : null}
        </InvoiceSummaryBox>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t.keep}
        </Button>
        <Button variant="danger" onClick={cancel} disabled={busy}>
          {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Ban className="size-[18px]" aria-hidden />}
          {confirmLabel ?? t.button}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** Szara ramka z numerem, kwotą i nabywcą — „o tym dokumencie mowa". */
export function InvoiceSummaryBox({
  invoice,
  children,
}: {
  invoice: InvoiceSummary;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card bg-surface-alt px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-[15px] font-semibold text-fg">{invoice.number}</span>
        <span className="shrink-0 font-mono text-[15px] font-semibold whitespace-nowrap text-fg">
          {invoice.amount}
        </span>
      </div>
      <span className="text-[13.5px] text-muted">{invoice.buyerName}</span>
      {children ? <div className="mt-1 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

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
function EditInvoiceNumberDialog({
  invoiceId,
  number,
  open,
  onClose,
}: {
  invoiceId: string;
  number: string;
  open: boolean;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const t = d.panel.panelMisc.editInvoiceNumber;
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(number);

  function close() {
    // Wpisany numer wraca do stanu z bazy: porzucona edycja nie może
    // zostawić w polu wartości, która nigdzie nie została zapisana.
    setValue(number);
    setError(null);
    onClose();
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await api.patch(`/api/invoices/${invoiceId}`, { number: value });
    setBusy(false);

    if (!result.ok) {
      setError(result.fields?.number?.[0] ?? result.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.button}
      closeLabel={d.panel.common.close}
      className="sm:max-w-[460px]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogBody>
          <FormField id="invoice-number" label={t.label} error={error ?? undefined}>
            <Input
              {...fieldAria("invoice-number", { error: error ?? undefined })}
              className="font-mono"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={busy}
            />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
            {t.save}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

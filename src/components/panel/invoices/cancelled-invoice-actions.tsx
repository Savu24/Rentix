"use client";

import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InvoiceSummaryBox, type InvoiceSummary } from "@/components/panel/invoices/invoice-menu";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Akcje na anulowanym dokumencie: przywrócenie albo trwałe usunięcie.
 *
 * Usunięcie idzie przez okno, bo zwalnia numer z rejestru — plakietka mówi
 * o dziurze w numeracji, chyba że to szkic, który numeru nie miał.
 */
export function CancelledInvoiceActions({
  invoice,
  isDraft,
}: {
  invoice: InvoiceSummary;
  isDraft: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.panelMisc.cancelledInvoice;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setBusy("restore");
    setError(null);

    const result = await api.post(`/api/invoices/${invoice.id}/restore`, {});
    setBusy(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  async function remove() {
    setBusy("delete");
    setError(null);

    const result = await api.delete(`/api/invoices/${invoice.id}/permanent`);

    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }

    router.replace("/panel/finanse");
    router.refresh();
  }

  return (
    <>
      <Button variant="danger-soft" onClick={() => setConfirming(true)} disabled={busy !== null}>
        <Trash2 className="size-[18px]" aria-hidden />
        {t.delete}
      </Button>
      <Button onClick={restore} disabled={busy !== null}>
        {busy === "restore" ? (
          <Loader2 className="size-[18px] animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="size-[18px]" aria-hidden />
        )}
        {t.restore}
      </Button>

      {error && !confirming ? (
        <Alert tone="error" className="w-full">
          {error}
        </Alert>
      ) : null}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t.deleteTitle}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[460px]"
      >
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <InvoiceSummaryBox invoice={invoice}>
            <Badge size="sm" tone={isDraft ? "outline" : "warning"} icon={isDraft ? undefined : AlertTriangle}>
              {isDraft ? t.noNumber : t.numberFreed}
            </Badge>
          </InvoiceSummaryBox>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy !== null}>
            {t.keep}
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy !== null}>
            {busy === "delete" ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
            {t.confirmDelete}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

"use client";

import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Akcje na anulowanym dokumencie: przywrócenie albo trwałe usunięcie.
 *
 * Usunięcie wymaga drugiego kliknięcia, bo zwalnia numer z rejestru —
 * ostrzeżenie mówi o dziurze, chyba że to szkic, który numeru nie miał.
 */
export function CancelledInvoiceActions({
  invoiceId,
  isDraft,
}: {
  invoiceId: string;
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

    const result = await api.post(`/api/invoices/${invoiceId}/restore`, {});
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

    const result = await api.delete(`/api/invoices/${invoiceId}/permanent`);

    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }

    router.replace("/panel/finanse");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <p className="text-xs text-muted">{isDraft ? t.deleteDraftWarning : t.deleteWarning}</p>

        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" variant="danger" onClick={remove} disabled={busy !== null}>
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t.confirmDelete}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(false)}
            disabled={busy !== null}
          >
            {t.keep}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" variant="secondary" onClick={restore} disabled={busy !== null}>
          {busy === "restore" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          {t.restore}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t.delete}
        </Button>
      </div>
    </div>
  );
}

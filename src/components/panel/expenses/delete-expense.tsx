"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Usunięcie kosztu z potwierdzeniem w oknie. Koszt nie ma kosza — zniknie
 * z listy i z raportów od razu, więc jedno kliknięcie to za mało.
 */
export function DeleteExpense({ expenseId, summary }: { expenseId: string; summary: string }) {
  const router = useRouter();
  const { d } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await api.delete(`/api/expenses/${expenseId}`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={d.panel.financePage.deleteExpense}
        className="flex size-8 items-center justify-center rounded-control text-subtle transition-colors hover:bg-bad-soft hover:text-bad"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={d.panel.financePage.deleteExpense}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[460px]"
      >
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <p className="text-[14.5px] break-words text-fg">{summary}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-[18px]" aria-hidden />
            )}
            {d.panel.common.delete}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

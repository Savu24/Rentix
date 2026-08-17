"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

/**
 * Usunięcie kosztu.
 *
 * Potwierdzenie przez zamianę przycisku w parę „usuń / anuluj", a nie przez
 * `confirm()` — natywne okno blokuje wątek przeglądarki i wygląda obco.
 */
export function DeleteExpense({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await api.delete(`/api/expenses/${expenseId}`);
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
        aria-label="Usuń koszt"
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

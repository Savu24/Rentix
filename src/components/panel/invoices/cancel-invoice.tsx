"use client";

import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

/**
 * Anulowanie dokumentu.
 *
 * Rekord zostaje w bazie — numer musi pozostać zajęty, żeby rejestr był ciągły.
 * Dokument z wpłatami odrzuca API, więc komunikat z serwera trafia wprost
 * do użytkownika zamiast być tłumaczony po raz drugi tutaj.
 */
export function CancelInvoice({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);

    const result = await api.delete(`/api/invoices/${invoiceId}`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          <Ban className="h-4 w-4" aria-hidden />
          Anuluj dokument
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <p className="text-xs text-muted">
        Dokument zostanie oznaczony jako anulowany. Numer zostaje zajęty, żeby w rejestrze
        nie powstała dziura.
      </p>

      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" variant="danger" onClick={cancel} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Anuluj dokument
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
          Zostaw
        </Button>
      </div>
    </div>
  );
}

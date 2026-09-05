"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";

/**
 * Wysłanie dokumentu najemcy na żądanie.
 *
 * Potwierdzenie przed wysyłką, bo to działanie wychodzące na zewnątrz —
 * wiadomości nie da się cofnąć. Nocny przebieg i tak rozsyła świeżo
 * wystawione dokumenty; ten przycisk jest po to, żeby nie czekać do rana
 * albo żeby ponowić wysyłkę po poprawieniu adresu.
 */
export function SendInvoice({
  invoiceId,
  tenantEmail,
  hasLease,
}: {
  invoiceId: string;
  tenantEmail: string | null;
  /** Odbiorca wisi na umowie — dokument jednorazowy nie ma go w ogole. */
  hasLease: boolean;
}) {
  const { d } = useI18n();
  const t = d.panel.financePage.send;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);

    const result = await api.post<{ sent: boolean; toEmail: string }>(
      `/api/invoices/${invoiceId}/send`,
      {},
    );

    setBusy(false);
    setConfirming(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSentTo(result.data.toEmail);
    router.refresh();
  }

  if (sentTo) {
    return <Alert tone="success">{fill(d.panel.panelMisc.sentTo, { email: sentTo })}</Alert>;
  }

  /*
    Dwie przyczyny, dwa komunikaty. Wczesniej oba przypadki dostawaly zdanie
    o brakujacym adresie, wiec dokument wystawiony poza umowa odsylal do
    kartoteki najemcy, w ktorej adres byl juz uzupelniony.
  */
  if (!hasLease) {
    return (
      <Alert tone="warning">
        {t.noLease}
      </Alert>
    );
  }

  if (!tenantEmail) {
    return (
      <Alert tone="warning">
        {t.noEmail}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {confirming ? (
        <>
          <p className="text-xs text-muted">
            {fill(t.confirm, { email: tenantEmail })}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" onClick={send} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {d.panel.panelMisc.sendNow}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              {d.panel.common.cancel}
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
            <Send className="h-4 w-4" aria-hidden />
            {t.button}
          </Button>
        </div>
      )}
    </div>
  );
}

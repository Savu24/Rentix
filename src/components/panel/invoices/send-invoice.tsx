"use client";

import { AlertTriangle, FileText, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlanLockMark } from "@/components/panel/plan-lock-mark";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { usePlanAllows } from "@/lib/billing/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { initials } from "@/lib/utils";

/**
 * Wysłanie dokumentu najemcy na żądanie (redesign/14-wyslij-anuluj-modale.svg).
 *
 * Okno potwierdzenia przed wysyłką, bo to działanie wychodzące na zewnątrz —
 * wiadomości nie da się cofnąć. Okno pokazuje odbiorcę i załącznik, zanim
 * ktoś kliknie. Nocny przebieg i tak rozsyła świeżo wystawione dokumenty;
 * ten przycisk jest po to, żeby nie czekać do rana albo żeby ponowić wysyłkę
 * po poprawieniu adresu.
 *
 * Gdy wysłać się nie da (plan bez wysyłki, dokument bez umowy, najemca bez
 * adresu), przycisk zostaje, a okno mówi krótko dlaczego — ukryty przycisk
 * zostawiałby pytanie, gdzie się podziała wysyłka.
 */
export function SendInvoice({
  invoiceId,
  tenant,
  hasLease,
  attachmentName,
  className,
}: {
  invoiceId: string;
  /** Pierwszy najemca umowy — to on dostaje dokument. */
  tenant: { id: string; name: string; email: string | null } | null;
  /** Odbiorca wisi na umowie — dokument jednorazowy nie ma go w ogóle. */
  hasLease: boolean;
  /** Nazwa pliku PDF w załączniku. */
  attachmentName: string;
  className?: string;
}) {
  const { d } = useI18n();
  const t = d.panel.financePage.send;
  const allowed = usePlanAllows("EMAIL_DELIVERY");
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSentTo(result.data.toEmail);
    router.refresh();
  }

  function close() {
    setOpen(false);
    setError(null);
    setSentTo(null);
  }

  /*
    Kłódka przed komunikatami o brakującym adresie: „uzupełnij adres najemcy"
    kazałoby poprawiać kartotekę, po czym wysyłka i tak by nie ruszyła.
  */
  const blocker = !allowed ? t.locked : !hasLease ? t.noLease : !tenant?.email ? t.noEmail : null;
  const canSend = blocker === null && !sentTo;

  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        <Send className="size-[18px]" aria-hidden />
        {t.button}
        <PlanLockMark feature="EMAIL_DELIVERY" variant="badge" />
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={t.button}
        closeLabel={d.panel.common.close}
        className="sm:max-w-[460px]"
      >
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {sentTo ? (
            <Alert tone="success">{fill(d.panel.panelMisc.sentTo, { email: sentTo })}</Alert>
          ) : null}

          {blocker ? (
            <Alert
              tone={allowed ? "warning" : "info"}
              action={
                allowed && hasLease && tenant ? (
                  <Link href={`/panel/najemcy/${tenant.id}`} className="hover:underline">
                    {t.openTenant}
                  </Link>
                ) : undefined
              }
            >
              {blocker}
            </Alert>
          ) : null}

          {tenant && hasLease ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-[550] text-muted">{t.to}</p>
              <div className="flex min-h-12 items-center gap-2.5 rounded-alert bg-surface-alt px-2.5 py-2">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                  aria-hidden
                >
                  {initials(tenant.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-[550] text-fg">{tenant.email ?? tenant.name}</span>
                  {tenant.email ? <span className="truncate text-[12.5px] text-muted">{tenant.name}</span> : null}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-[550] text-muted">{t.attachment}</p>
            <div className="flex min-h-12 items-center gap-2.5 rounded-alert bg-surface-alt px-3.5 py-2">
              <FileText className="size-[18px] shrink-0 text-bad" aria-hidden />
              <span className="min-w-0 truncate font-mono text-sm font-[550] text-fg">{attachmentName}</span>
            </div>
          </div>

          {canSend ? (
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <AlertTriangle className="size-4 shrink-0 text-warn" strokeWidth={1.9} aria-hidden />
              {t.irreversible}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {sentTo ? d.panel.common.close : d.panel.common.cancel}
          </Button>
          {sentTo ? null : (
            <Button onClick={send} disabled={busy || !canSend}>
              {busy ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <Send className="size-[18px]" aria-hidden />
              )}
              {t.submit}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </>
  );
}

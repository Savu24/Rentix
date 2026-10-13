"use client";

import { ArrowRight, Building2, DoorOpen, History, Loader2, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";

/**
 * Zakończenie umowy (redesign/11-umowa-zakonczenie-modal.svg).
 *
 * Skutek pokazany strukturą, a nie zdaniem: lokal przechodzi na „Wolna",
 * najemcy na „Były najemca". Tak samo zrobi to serwer po zapisie — okno
 * tylko zapowiada, co się zmieni, zanim ktoś kliknie.
 */
export function TerminateLease({
  leaseId,
  unitLabel,
  tenantCount,
}: {
  leaseId: string;
  /** „Ogrodowa 3, Pokój 2" — lokal, który wróci do puli wolnych. */
  unitLabel: string;
  tenantCount: number;
}) {
  const router = useRouter();
  const { d, plural } = useI18n();
  const t = d.panel.leasesPage.terminate;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminatedAt, setTerminatedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await api.post(`/api/leases/${leaseId}/terminate`, {
      terminatedAt,
      terminationNote: note,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="danger-soft" onClick={() => setOpen(true)}>
        <XCircle className="size-[18px]" aria-hidden />
        {t.button}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={t.button} closeLabel={d.panel.common.close}>
        <DialogBody>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <FormField id="terminatedAt" label={t.endDate} className="sm:max-w-60">
            <DateInput
              id="terminatedAt"
              value={terminatedAt}
              onChange={(event) => setTerminatedAt(event.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField id="terminationNote" label={t.note}>
            <Textarea
              id="terminationNote"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              className="min-h-[72px]"
            />
          </FormField>

          <div className="flex flex-col gap-3 rounded-xl bg-surface-alt p-4">
            <div className="flex items-center gap-3">
              <Building2 className="size-[18px] shrink-0 text-subtle" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-[550] text-fg">{unitLabel}</span>
              <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden />
              <Badge tone="info" icon={DoorOpen}>
                {d.panel.propertiesPage.badge.vacant}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-[18px] shrink-0 text-subtle" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-[550] text-fg">
                {fill(plural(tenantCount, d.panel.tenantsPage.count), { count: tenantCount })}
              </span>
              <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden />
              <Badge icon={History}>{d.panel.tenants.status.FORMER}</Badge>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy || !terminatedAt}>
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <XCircle className="size-[18px]" aria-hidden />
            )}
            {t.button}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

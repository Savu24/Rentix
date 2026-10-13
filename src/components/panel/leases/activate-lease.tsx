"use client";

import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

import type { LeaseStatus } from "@/generated/prisma/enums";
import { useI18n } from "@/lib/i18n/client";
/**
 * Uruchomienie umowy ze szkicu albo rezerwacji.
 *
 * Osobna akcja obok edycji, bo to jedno kliknięcie, które robi coś więcej niż
 * zmiana pola: lokal staje się zajęty, najemcy czynni, a naliczanie rusza od
 * pierwszego terminu. Szukanie tego w formularzu z dwudziestoma polami
 * kończyłoby się umową „aktywną" tylko z nazwy — dopisaną ręcznie w bazie
 * albo zakładaną drugi raz od zera.
 */
export function ActivateLease({
  leaseId,
  status,
}: {
  leaseId: string;
  /** Bieżący status — szkic albo rezerwacja. */
  status: Extract<LeaseStatus, "DRAFT" | "RESERVED">;
}) {
  const { d } = useI18n();
  const t = d.panel.leasesPage;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setError(null);
    setBusy(true);

    const result = await api.patch(`/api/leases/${leaseId}`, { status: "ACTIVE" });
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-alert bg-info-soft px-4 py-3.5 text-info-ink sm:flex-row sm:items-center">
      <span className="flex flex-1 items-center gap-3 text-sm font-medium">
        <CalendarClock className="size-[18px] shrink-0 text-info" strokeWidth={1.9} aria-hidden />
        {status === "RESERVED" ? t.activate.reserved : t.activate.draft}
      </span>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button size="sm" onClick={activate} disabled={busy} className="self-start sm:self-auto">
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <CheckCircle2 className="size-4" aria-hidden />
        )}
        {t.activateButton}
      </Button>
    </div>
  );
}

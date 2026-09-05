"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { leaseStatusLabels } from "@/lib/validations/lease";

import type { LeaseStatus } from "@/generated/prisma/enums";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
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
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">
            {status === "RESERVED" ? t.activate.reserved : t.activate.draft}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {fill(t.activateLead, {
              status: leaseStatusLabels(d)[status].toLowerCase(),
            })}
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div>
          <Button size="sm" onClick={activate} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            )}
            {t.activateButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

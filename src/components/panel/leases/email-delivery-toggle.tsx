"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Wysyłka rachunków mailem — przełącznik na widoku umowy.
 *
 * Ustawia się go przy zakładaniu umowy, ale musi dać się zmienić później:
 * najemca, który przez rok chciał papieru, w końcu prosi o maile, a odwrotna
 * pomyłka przy zakładaniu umowy bez tego przełącznika byłaby nie do naprawienia
 * z poziomu panelu.
 *
 * Zapisuje się od razu, bez osobnego „Zapisz". To jedno pole, a przycisk
 * zatwierdzania przy jednym polu bywa zapominany — zostawia wtedy ustawienie,
 * które wygląda na zmienione i nie jest.
 */
export function EmailDeliveryToggle({
  leaseId,
  enabled,
}: {
  leaseId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const { d } = useI18n();
  const t = d.panel.leasesPage.emailToggle;
  const [checked, setChecked] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setError(null);
    setBusy(true);
    setChecked(next);

    const result = await api.patch(`/api/leases/${leaseId}`, { sendInvoicesByEmail: next });
    setBusy(false);

    if (!result.ok) {
      // Cofamy: przełącznik zostawiony w nowej pozycji kłamałby o stanie umowy.
      setChecked(!next);
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="flex items-center gap-2">
        <CheckboxField
          label={t.label}
          hint={t.off}
          checked={checked}
          disabled={busy}
          onChange={(event) => toggle(event.target.checked)}
        />
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-hidden /> : null}
      </div>
    </div>
  );
}

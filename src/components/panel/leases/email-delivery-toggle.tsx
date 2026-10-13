"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
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

      <div className="flex items-center gap-3">
        <Mail className="size-[18px] shrink-0 text-subtle" aria-hidden />
        <label htmlFor="sendInvoicesByEmail" className="flex-1 text-[14.5px] font-semibold text-fg">
          {t.label}
        </label>
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-subtle" aria-hidden /> : null}
        <Switch
          id="sendInvoicesByEmail"
          checked={checked}
          disabled={busy}
          onCheckedChange={toggle}
        />
      </div>
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { api } from "@/lib/api/client";

/**
 * Data, przed którą umowa nie jest naliczana — edytowalna na widoku umowy.
 *
 * Przy przenoszeniu portfela z innego programu ustawia się ją przy zakładaniu
 * umowy, ale musi dać się poprawić później: pomyłka o miesiąc wychodzi zwykle
 * dopiero wtedy, gdy nocny przebieg nie wystawi dokumentu, którego się
 * spodziewano. Bez tego pola jedynym ratunkiem byłoby ręczne grzebanie w bazie.
 *
 * Zapisuje się od razu po wybraniu daty, tak samo jak przełącznik wysyłki obok.
 * `DateInput` zgłasza zmianę dopiero przy pełnej dacie albo wyczyszczeniu
 * pola, więc nie ma tu stanu „w połowie wpisany rok”, który trzeba by odsiewać.
 */
export function BillingStartField({
  leaseId,
  billingStartsAt,
}: {
  leaseId: string;
  /** Format RRRR-MM-DD albo pusty — naliczanie od początku umowy. */
  billingStartsAt: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(billingStartsAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    const previous = value;

    setError(null);
    setBusy(true);
    setValue(next);

    const result = await api.patch(`/api/leases/${leaseId}`, { billingStartsAt: next });
    setBusy(false);

    if (!result.ok) {
      // Cofamy: pole zostawione z nową datą kłamałoby o tym, od kiedy
      // naliczamy — a ta pomyłka wychodzi dopiero brakiem faktury.
      setValue(previous);
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <FormField
        id="billingStartsAt"
        label="Nie naliczaj przed"
        hint="Miesiące rozliczone w poprzednim programie. Puste = naliczaj od początku umowy."
      >
        <div className="flex items-center gap-2">
          <DateInput
            className="max-w-[12rem]"
            value={value}
            disabled={busy}
            onChange={(event) => save(event.target.value)}
          />
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-hidden />
          ) : null}
        </div>
      </FormField>
    </div>
  );
}

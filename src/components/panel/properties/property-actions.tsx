"use client";

import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

/**
 * Archiwizacja i przywracanie nieruchomości.
 *
 * Nie ma tu trwałego usuwania: z obiektem wiszą umowy i faktury, czyli
 * historia księgowa. API pozwala skasować tylko obiekt, który nigdy nie miał
 * umowy — a taki przypadek nie jest wart osobnego przycisku w interfejsie.
 */
export function PropertyActions({
  propertyId,
  propertyName,
  archived,
}: {
  propertyId: string;
  propertyName: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "archive" | "restore") {
    setBusy(true);
    setError(null);

    const result =
      action === "archive"
        ? await api.delete(`/api/properties/${propertyId}`)
        : await api.post(`/api/properties/${propertyId}/restore`, {});

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  if (archived) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => run("restore")} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArchiveRestore className="h-4 w-4" aria-hidden />
          )}
          Przywróć
        </Button>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    );
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
        <Archive className="h-4 w-4" aria-hidden />
        Archiwizuj
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Zarchiwizować „{propertyName}”?</span>
        <Button size="sm" variant="danger" onClick={() => run("archive")} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Tak, archiwizuj
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
          Anuluj
        </Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

"use client";

import { Loader2, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";

/**
 * Wypowiedzenie umowy.
 *
 * Za potwierdzeniem, bo operacja jest nieodwracalna z poziomu interfejsu:
 * zwalnia jednostkę i przestawia najemców na „byłych".
 */
export function TerminateLease({ leaseId }: { leaseId: string }) {
  const router = useRouter();
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

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" aria-hidden />
        Zakończ umowę
      </Button>
    );
  }

  return (
    <Card className="border-bad/40">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-fg">Zakończenie umowy</p>
          <p className="mt-0.5 text-xs text-muted">
            Jednostka wróci do puli wolnych, a najemcy zmienią status na „były najemca”.
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="terminatedAt" label="Data zakończenia">
            <Input
              id="terminatedAt"
              type="date"
              value={terminatedAt}
              onChange={(event) => setTerminatedAt(event.target.value)}
              disabled={busy}
            />
          </FormField>
        </div>

        <FormField id="terminationNote" label="Powód / uwagi" hint="Opcjonalne.">
          <Textarea
            id="terminationNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
          />
        </FormField>

        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" variant="danger" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Zakończ umowę
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

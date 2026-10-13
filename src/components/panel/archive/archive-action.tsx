"use client";

import { Archive, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionMenu } from "@/components/panel/action-menu";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";

/**
 * Przycisk archiwizacji na karcie pojedynczego rekordu.
 *
 * Ten sam komponent obsługuje najemcę, właściciela i umowę — różni je tylko
 * ścieżka API i zdanie w potwierdzeniu. Nieruchomości mają własny
 * `PropertyActions`, bo tam archiwizacja idzie w parze z innymi operacjami
 * na pokojach.
 *
 * Odmowa z serwera trafia wprost do użytkownika: „umowa jest aktywna",
 * „właściciel ma przypisane lokale" to konkretne powody, a nie awarie —
 * tłumaczenie ich drugi raz tutaj tylko rozjechałoby komunikaty.
 */
export function ArchiveAction({
  endpoint,
  id,
  archived,
  label,
  hint,
}: {
  /** Ścieżka kartoteki, np. „/api/tenants". */
  endpoint: string;
  id: string;
  archived: boolean;
  /** Nazwa rekordu w mianowniku, np. „najemcę". */
  label: string;
  /** Co się stanie — pokazywane przed potwierdzeniem. */
  hint: string;
}) {
  const router = useRouter();
  const { d } = useI18n();
  const t = d.panel.archiveAction;
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "archive" | "restore") {
    setBusy(true);
    setError(null);

    const result =
      action === "archive"
        ? await api.delete(`${endpoint}/${id}`)
        : await api.post(`${endpoint}/${id}/restore`, {});

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
      <div className="flex flex-col gap-2">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button variant="secondary" onClick={() => run("restore")} disabled={busy}>
          {busy ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="size-[18px]" aria-hidden />
          )}
          {t.restore}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Archiwizacja jest rzadka i odwracalna, ale nie codzienna — siedzi
          w menu „⋯", a potwierdzenie w oknie mówi, co się stanie. */}
      <ActionMenu
        size="md"
        label={d.panel.common.more}
        items={[
          {
            label: t.archive,
            icon: Archive,
            danger: true,
            onSelect: () => {
              setError(null);
              setConfirming(true);
            },
          },
        ]}
      />

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={fill(t.archiveWithLabel, { label })}
        closeLabel={d.panel.common.close}
      >
        <DialogBody>
          <p className="text-sm text-fg">{hint}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button variant="danger" onClick={() => run("archive")} disabled={busy}>
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
            {t.archive}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

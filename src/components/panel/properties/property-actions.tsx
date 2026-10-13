"use client";

import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
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
 * Archiwizacja i przywracanie nieruchomości — menu „⋯" w nagłówku karty.
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
  const { d } = useI18n();
  const misc = d.panel.panelMisc;
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
        <Button variant="secondary" onClick={() => run("restore")} disabled={busy}>
          {busy ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <ArchiveRestore className="size-[18px]" aria-hidden />
          )}
          {d.panel.common.restore}
        </Button>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    );
  }

  return (
    <>
      <ActionMenu
        size="md"
        label={d.panel.common.more}
        items={[
          {
            label: d.panel.common.archive,
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
        title={d.panel.common.archive}
        closeLabel={d.panel.common.close}
      >
        <DialogBody>
          <p className="text-sm text-fg">{fill(misc.archiveConfirm, { name: propertyName })}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            {d.panel.common.cancel}
          </Button>
          <Button variant="danger" onClick={() => run("archive")} disabled={busy}>
            {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
            {misc.archiveYes}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

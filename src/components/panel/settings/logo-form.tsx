"use client";

import { ImageIcon, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { LOGO_MIME_TYPES, MAX_LOGO_BYTES } from "@/lib/validations/settings";

/**
 * Logo drukowane w nagłówku dokumentów.
 *
 * Plik idzie na serwer jako data URI w JSON-ie, nie jako multipart: obrazek
 * jest jeden na organizację i ląduje w bazie, więc nie ma po co budować
 * osobnej ścieżki na pliki ani magazynu, który trzeba by sprzątać.
 *
 * Bez logo dokument wygląda dokładnie tak, jak dotąd — dlatego nic tu nie
 * krzyczy o uzupełnienie, w przeciwieństwie do adresu wystawcy.
 */
export function LogoForm({ logo }: { logo: string | null }) {
  const { d } = useI18n();
  const t = d.panel.settings.logo;
  const misc = d.panel.panelMisc;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxKb = Math.round(MAX_LOGO_BYTES / 1024);

  async function upload(file: File) {
    setError(null);

    // Rozmiar sprawdzamy przed odczytem pliku: przy zdjęciu z telefonu
    // czekanie na wczytanie kilku megabajtów tylko po to, żeby serwer je
    // odrzucił, wygląda jak zawieszenie.
    if (file.size > MAX_LOGO_BYTES) {
      setError(
        fill(misc.logoTooBig, { max: maxKb, actual: Math.round(file.size / 1024) }),
      );
      return;
    }

    setBusy(true);

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) {
      setBusy(false);
      setError(t.readError);
      return;
    }

    const result = await api.put("/api/organization/logo", { dataUrl });
    setBusy(false);

    if (!result.ok) {
      setError(result.fields?.dataUrl?.[0] ?? result.message);
      return;
    }

    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);

    const result = await api.delete("/api/organization/logo");
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={LOGO_MIME_TYPES.join(",")}
      className="sr-only"
      disabled={busy}
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Czyścimy pole od razu: bez tego wybranie tego samego pliku
        // po nieudanej próbie nie wywołałoby zdarzenia zmiany.
        event.target.value = "";
        if (file) void upload(file);
      }}
    />
  );

  return (
    <SectionCard title={t.title} icon={ImageIcon}>
      <div className="flex flex-col gap-3">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {fileInput}

        {logo ? (
          <>
            <div className="flex h-24 items-center justify-center rounded-alert border border-border bg-surface-alt p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI, nie ma czego optymalizować */}
              <img src={logo} alt={t.alt} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="size-4" aria-hidden />
                )}
                {t.change}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
                <Trash2 className="size-4" aria-hidden />
                {d.panel.common.delete}
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label={t.upload}
            className="flex h-[88px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-hover text-[13.5px] font-[550] text-muted transition-colors hover:text-fg"
          >
            {busy ? (
              <Loader2 className="size-[22px] animate-spin" aria-hidden />
            ) : (
              <Upload className="size-[22px]" strokeWidth={1.8} aria-hidden />
            )}
            {misc.logoHint}
          </button>
        )}

        <p className="text-center text-[12.5px] text-subtle">{fill(t.maxSize, { kb: maxKb })}</p>
      </div>
    </SectionCard>
  );
}

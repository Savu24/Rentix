"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
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
      setError(`Obrazek może ważyć najwyżej ${maxKb} kB. Ten ma ${Math.round(file.size / 1024)} kB.`);
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

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            Pojawia się w nagłówku rachunków i faktur. Nieobowiązkowe. Bez niego dokument
            wygląda tak jak teraz.
          </p>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-40 items-center justify-center rounded-control border border-border bg-surface-alt p-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URI, nie ma czego optymalizować
              <img src={logo} alt={t.alt} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">{t.empty}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={inputRef}
              type="file"
              accept={LOGO_MIME_TYPES.join(",")}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Czyścimy pole od razu: bez tego wybranie tego samego pliku
                // po nieudanej próbie nie wywołałoby zdarzenia zmiany.
                event.target.value = "";
                if (file) void upload(file);
              }}
            />

            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden />
              )}
              {logo ? t.change : t.upload}
            </Button>

            {logo ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Usuń
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted">
          PNG albo JPEG, najwyżej {maxKb} kB. Najlepiej wygląda logo poziome na przezroczystym
          albo białym tle.
        </p>
      </CardContent>
    </Card>
  );
}

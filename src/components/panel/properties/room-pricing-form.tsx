"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { formatMoney, formatMoneyParts, parseMoney, sumGrosze } from "@/lib/money";

export type PricedRoom = {
  id: string;
  name: string;
  /** Kwota jako tekst do pola formularza („900,00"), nie grosze. */
  rent: string;
};

/**
 * Krok po założeniu nieruchomości: nazwy i ceny pokoi.
 *
 * Wszystko idzie jednym PATCH-em na `/api/properties/:id/rooms`, a nie N
 * żądaniami — inaczej przy zerwanym połączeniu zapisałaby się część cen
 * i nie byłoby wiadomo która.
 */
export function RoomPricingForm({
  propertyId,
  initialRooms,
}: {
  propertyId: string;
  initialRooms: PricedRoom[];
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.roomsPanel;
  const misc = d.panel.panelMisc;
  const { currency } = formatMoneyParts(0, locale);
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});

  function update(index: number, patch: Partial<PricedRoom>) {
    setRooms((current) =>
      current.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    );
  }

  /** Podgląd sumy — ile przyniesie miesięcznie komplet wynajętych pokoi. */
  const total = sumGrosze(rooms.map((room) => parseMoney(room.rent, locale) ?? 0));

  async function save() {
    setError(null);

    // Walidujemy lokalnie, żeby wskazać konkretny wiersz zamiast pokazywać
    // jeden komunikat na górze formularza.
    const nextFieldErrors: Record<number, string> = {};
    rooms.forEach((room, index) => {
      if (!room.name.trim()) nextFieldErrors[index] = t.nameRequired;
      else if (room.rent.trim() !== "" && parseMoney(room.rent, locale) === null) {
        nextFieldErrors[index] = t.rentInvalid;
      }
    });

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const result = await api.patch(`/api/properties/${propertyId}/rooms`, {
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name.trim(),
        monthlyRentGrosze: room.rent.trim() === "" ? null : room.rent,
      })),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/panel/nieruchomosci/${propertyId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="rounded-tile border border-border bg-surface lg:rounded-card">
        <div className="hidden grid-cols-[minmax(0,1fr)_240px] gap-4 px-7 pt-5 text-[13px] font-[550] text-muted sm:grid">
          <span>{t.pricingName}</span>
          <span>{t.pricingRent}</span>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:gap-3 sm:px-7 sm:pt-3">
          {rooms.map((room, index) => (
            <div key={room.id} className="flex flex-col gap-1.5">
              <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`room-name-${room.id}`} className="sm:sr-only">
                    {t.pricingName}
                  </Label>
                  <Input
                    id={`room-name-${room.id}`}
                    value={room.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    aria-invalid={fieldErrors[index] ? true : undefined}
                    disabled={busy}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor={`room-rent-${room.id}`} className="sm:sr-only">
                    {t.pricingRent}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`room-rent-${room.id}`}
                      value={room.rent}
                      onChange={(event) => update(index, { rent: event.target.value })}
                      aria-invalid={fieldErrors[index] ? true : undefined}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="pr-10 font-mono"
                      disabled={busy}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
                      {currency}
                    </span>
                  </div>
                </div>
              </div>

              {fieldErrors[index] ? (
                <p role="alert" className="flex items-center gap-1.5 text-[12.5px] font-medium text-bad">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fieldErrors[index]}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex min-h-[60px] items-center justify-between gap-3 border-t border-border px-4 sm:px-7">
          <span className="text-sm font-[550] text-muted">{misc.roomsSum}</span>
          <span className="font-mono text-base font-[650] text-fg">{formatMoney(total, locale)}</span>
        </div>
      </section>

      <div className="flex flex-row-reverse flex-wrap justify-start gap-2.5">
        <Button onClick={save} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
              {t.saving}
            </>
          ) : (
            <>
              <Check className="size-[18px]" aria-hidden />
              {t.saveAndFinish}
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => router.push(`/panel/nieruchomosci/${propertyId}`)}
        >
          {t.skipPricing}
        </Button>
      </div>
    </div>
  );
}

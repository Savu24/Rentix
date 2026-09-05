"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { formatMoney, parseMoney } from "@/lib/money";

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
  const { d, locale, plural } = useI18n();
  const t = d.panel.propertiesPage.roomsPanel;
  const misc = d.panel.panelMisc;
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
  const total = rooms.reduce((sum, room) => sum + (parseMoney(room.rent, locale) ?? 0), 0);

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
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-fg">
              {rooms.length} {plural(rooms.length, misc.roomsCount)}
            </h2>
            {total > 0 ? (
              /* Kwota ma zostać w monospace także po przetłumaczeniu, więc
                 zdanie rozcinamy na dziurze po kwocie zamiast wstawiać ją
                 gotowym tekstem. */
              <p className="text-sm text-muted">
                {misc.roomsTotal.split("{amount}")[0]}
                <span className="tabular font-mono font-medium text-fg">
                  {formatMoney(total, locale)}
                </span>
                {misc.roomsTotal.split("{amount}")[1]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {rooms.map((room, index) => (
              <div key={room.id} className="flex flex-col gap-1.5">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
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
                    <Input
                      id={`room-rent-${room.id}`}
                      value={room.rent}
                      onChange={(event) => update(index, { rent: event.target.value })}
                      aria-invalid={fieldErrors[index] ? true : undefined}
                      inputMode="decimal"
                      disabled={busy}
                    />
                  </div>
                </div>

                {fieldErrors[index] ? (
                  <p role="alert" className="text-xs font-medium text-bad">
                    {fieldErrors[index]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted">
            {t.pricingLead}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={save} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t.saving}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden />
              {t.saveAndFinish}
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => router.push(`/panel/nieruchomosci/${propertyId}`)}
        >
          {t.skipPricing}
        </Button>
      </div>
    </div>
  );
}

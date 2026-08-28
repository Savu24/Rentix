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
import { formatPLN, parsePLN } from "@/lib/money";
import { plural } from "@/lib/utils";

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
  const total = rooms.reduce((sum, room) => sum + (parsePLN(room.rent) ?? 0), 0);

  async function save() {
    setError(null);

    // Walidujemy lokalnie, żeby wskazać konkretny wiersz zamiast pokazywać
    // jeden komunikat na górze formularza.
    const nextFieldErrors: Record<number, string> = {};
    rooms.forEach((room, index) => {
      if (!room.name.trim()) nextFieldErrors[index] = "Podaj oznaczenie pokoju";
      else if (room.rent.trim() !== "" && parsePLN(room.rent) === null) {
        nextFieldErrors[index] = "Czynsz musi być kwotą, np. 900,00";
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
              {rooms.length} {plural(rooms.length, ["pokój", "pokoje", "pokoi"])}
            </h2>
            {total > 0 ? (
              <p className="text-sm text-muted">
                Razem{" "}
                <span className="tabular font-mono font-medium text-fg">{formatPLN(total)}</span>{" "}
                miesięcznie
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {rooms.map((room, index) => (
              <div key={room.id} className="flex flex-col gap-1.5">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`room-name-${room.id}`} className="sm:sr-only">
                      Oznaczenie pokoju
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
                      Czynsz miesięczny
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
            Ceny możesz zostawić puste i uzupełnić później. Najemców przypiszesz
            do pokoi w widoku nieruchomości.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={save} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Zapisywanie…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Zapisz i zakończ
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => router.push(`/panel/nieruchomosci/${propertyId}`)}
        >
          Pomiń ceny
        </Button>
      </div>
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DoorClosed, Loader2, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { formatPLN } from "@/lib/money";
import { plural } from "@/lib/utils";
import {
  RENTAL_STATUS_LABEL,
  RENTAL_STATUS_TONE,
  roomFormSchema,
  type RoomFormInput,
  type RoomFormOutput,
} from "@/lib/validations/property";

export type RoomView = {
  id: string;
  name: string;
  status: keyof typeof RENTAL_STATUS_LABEL;
  monthlyRentGrosze: number | null;
  /** Osoba przypisana przez aktywną umowę na ten pokój. */
  tenantId: string | null;
  tenantName: string | null;
  leaseId: string | null;
};

/**
 * Pokoje nieruchomości.
 *
 * Przypisanie osoby do pokoju idzie przez umowę, a nie przez pole na pokoju —
 * inaczej powstałyby dwa źródła prawdy o tym, kto gdzie mieszka, i przy
 * pierwszym wypowiedzeniu rozjechałyby się ze sobą.
 */
export function RoomsList({
  propertyId,
  propertyName,
  rooms,
  wholePropertyTenant,
}: {
  propertyId: string;
  propertyName: string;
  rooms: RoomView[];
  /** Najemca całej nieruchomości — wtedy pokoje nie są wynajmowane osobno. */
  wholePropertyTenant: { id: string; name: string; leaseId: string } | null;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const occupied = rooms.filter((room) => room.status === "OCCUPIED").length;
  const totalRent = rooms.reduce((sum, room) => sum + (room.monthlyRentGrosze ?? 0), 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-baseline gap-2 text-[15px] font-semibold text-fg">
          <span className="flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-muted" aria-hidden />
            Pokoje
          </span>
          {rooms.length > 0 ? (
            <span className="text-sm font-normal text-muted">
              {occupied}/{rooms.length} zajętych
              {totalRent > 0 ? ` · ${formatPLN(totalRent)} miesięcznie` : ""}
            </span>
          ) : null}
        </h2>

        {!creating ? (
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Dodaj pokój
          </Button>
        ) : null}
      </div>

      {wholePropertyTenant ? (
        <Alert tone="info">
          Cała nieruchomość jest wynajęta —{" "}
          <Link
            href={`/panel/najemcy/${wholePropertyTenant.id}`}
            className="font-medium underline"
          >
            {wholePropertyTenant.name}
          </Link>
          . Pokoje nie są wynajmowane osobno.
        </Alert>
      ) : null}

      {creating ? (
        <RoomForm
          propertyId={propertyId}
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {rooms.length === 0 && !creating ? (
        <EmptyState
          icon={DoorClosed}
          title="Ta nieruchomość nie ma pokoi"
          description="Dodaj pokoje, jeśli chcesz wynajmować je osobno. Bez nich nieruchomość wynajmuje się w całości."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Dodaj pokój
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) =>
            editing === room.id ? (
              <li key={room.id}>
                <RoomForm
                  propertyId={propertyId}
                  room={room}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={room.id}>
                <RoomRow
                  room={room}
                  propertyId={propertyId}
                  propertyName={propertyName}
                  disabled={Boolean(wholePropertyTenant)}
                  onEdit={() => setEditing(room.id)}
                />
              </li>
            ),
          )}
        </ul>
      )}

      {rooms.length > 0 ? (
        <p className="text-xs text-muted">
          {plural(rooms.length - occupied, ["Wolny", "Wolne", "Wolnych"])}{" "}
          {rooms.length - occupied}{" "}
          {plural(rooms.length - occupied, ["pokój", "pokoje", "pokoi"])}.
        </p>
      ) : null}
    </section>
  );
}

function RoomRow({
  room,
  propertyId,
  propertyName,
  disabled,
  onEdit,
}: {
  room: RoomView;
  propertyId: string;
  propertyName: string;
  disabled: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await api.delete(`/api/rooms/${room.id}`);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusDot tone={RENTAL_STATUS_TONE[room.status]} />

          <span className="text-sm font-semibold text-fg">{room.name}</span>

          <span className="min-w-0 flex-1">
            {room.tenantId ? (
              <Link
                href={`/panel/najemcy/${room.tenantId}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                {room.tenantName}
              </Link>
            ) : (
              <Badge tone={RENTAL_STATUS_TONE[room.status]}>
                {RENTAL_STATUS_LABEL[room.status]}
              </Badge>
            )}
          </span>

          {room.monthlyRentGrosze ? (
            <span className="tabular font-mono text-sm text-fg">
              {formatPLN(room.monthlyRentGrosze)}
            </span>
          ) : (
            <span className="text-xs text-muted">bez ceny</span>
          )}

          <span className="flex items-center gap-0.5">
            {room.tenantId && room.leaseId ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/panel/umowy/${room.leaseId}`}>Umowa</Link>
              </Button>
            ) : !disabled ? (
              <Button asChild size="sm" variant="ghost">
                <Link
                  href={`/panel/umowy/nowa?propertyId=${propertyId}&roomId=${room.id}`}
                  title={`Przypisz najemcę do pokoju ${room.name} w ${propertyName}`}
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Przypisz</span>
                </Link>
              </Button>
            ) : null}

            <Button size="sm" variant="ghost" onClick={onEdit} disabled={busy}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Edytuj pokój {room.name}</span>
            </Button>

            <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="sr-only">Usuń pokój {room.name}</span>
            </Button>
          </span>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}

function RoomForm({
  propertyId,
  room,
  onDone,
  onCancel,
}: {
  propertyId: string;
  room?: RoomView;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(room);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormInput, unknown, RoomFormOutput>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: room?.name ?? "",
      status: room?.status ?? "AVAILABLE",
      monthlyRentGrosze:
        room?.monthlyRentGrosze != null ? (room.monthlyRentGrosze / 100).toFixed(2) : "",
      notes: "",
    },
  });

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);
    const values = getValues();

    const result = isEdit
      ? await api.patch(`/api/rooms/${room!.id}`, values)
      : await api.post(`/api/properties/${propertyId}/rooms`, values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof RoomFormInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    onDone();
    router.refresh();
  }

  const idFor = (suffix: string) => `room-${suffix}-${room?.id ?? "new"}`;

  return (
    <Card className="border-accent/40">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">
              {isEdit ? `Pokój ${room!.name}` : "Nowy pokój"}
            </p>
            <Button type="button" size="icon" variant="ghost" onClick={onCancel} aria-label="Zamknij">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={idFor("name")} label="Oznaczenie" error={errors.name?.message}>
              <Input
                {...fieldAria(idFor("name"), { error: errors.name?.message })}
                placeholder="Pokój 1"
                disabled={isSubmitting}
                {...register("name")}
              />
            </FormField>

            <FormField id={idFor("status")} label="Status" error={errors.status?.message}>
              <Select
                {...fieldAria(idFor("status"), { error: errors.status?.message })}
                disabled={isSubmitting}
                {...register("status")}
              >
                {Object.entries(RENTAL_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id={idFor("rent")}
              label="Czynsz za pokój"
              error={errors.monthlyRentGrosze?.message}
            >
              <Input
                {...fieldAria(idFor("rent"), { error: errors.monthlyRentGrosze?.message })}
                inputMode="decimal"
                placeholder="900,00"
                disabled={isSubmitting}
                {...register("monthlyRentGrosze")}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isEdit ? "Zapisz" : "Dodaj pokój"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Anuluj
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

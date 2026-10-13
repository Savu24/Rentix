"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, DoorOpen, Home, Loader2, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ActionMenu } from "@/components/panel/action-menu";
import { CardRows, SectionCard } from "@/components/panel/section-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RentalStatus } from "@/generated/prisma/enums";
import { api } from "@/lib/api/client";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import { fill } from "@/lib/i18n/format";
import { formatMoney, formatMoneyParts, sumGrosze } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  rentalStatusLabels,
  roomFormSchema,
  type RoomFormInput,
  type RoomFormOutput,
} from "@/lib/validations/property";

export type RoomView = {
  id: string;
  name: string;
  status: RentalStatus;
  monthlyRentGrosze: number | null;
  /** Osoba przypisana przez aktywną umowę na ten pokój. */
  tenantId: string | null;
  tenantName: string | null;
  leaseId: string | null;
};

/**
 * Pokoje nieruchomości (redesign/04-nieruchomosc-karta-*.svg).
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
  wholeLetHref,
}: {
  propertyId: string;
  propertyName: string;
  rooms: RoomView[];
  /** Najemca całej nieruchomości — wtedy pokoje nie są wynajmowane osobno. */
  wholePropertyTenant: { id: string; name: string; leaseId: string } | null;
  /** Adres umowy na całość — tylko gdy nikt jeszcze nie zajmuje pokoi. */
  wholeLetHref: string | null;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.roomsPanel;
  const misc = d.panel.panelMisc;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoomView | null>(null);

  const occupied = rooms.filter((room) => room.status === "OCCUPIED").length;
  const totalRent = sumGrosze(rooms.map((room) => room.monthlyRentGrosze ?? 0));

  return (
    <SectionCard
      title={misc.roomsTitle}
      count={rooms.length > 0 ? fill(misc.roomsOccupied, { occupied, total: rooms.length }) : undefined}
      actions={
        <>
          {wholeLetHref ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={wholeLetHref}>
                <Home className="size-4" aria-hidden />
                {d.panel.propertiesPage.detail.wholeLetButton}
              </Link>
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {t.add}
          </Button>
        </>
      }
      footer={
        totalRent > 0 ? (
          <>
            <span className="text-sm font-[550] text-muted">{misc.roomsSum}</span>
            <span className="font-mono text-[15px] font-[650] text-fg">
              {formatMoney(totalRent, locale)}
            </span>
          </>
        ) : undefined
      }
    >
      {wholePropertyTenant ? (
        <Alert tone="info" className="mb-3">
          {t.wholeLet}
          <Link href={`/panel/najemcy/${wholePropertyTenant.id}`} className="underline">
            {wholePropertyTenant.name}
          </Link>
          {t.notLetSeparately}
        </Alert>
      ) : null}

      {rooms.length === 0 ? (
        <p className="py-3 text-sm text-muted">{t.emptyTitle}</p>
      ) : (
        <CardRows>
          {rooms.map((room) => (
            <li key={room.id}>
              <RoomRow
                room={room}
                propertyId={propertyId}
                propertyName={propertyName}
                disabled={Boolean(wholePropertyTenant)}
                onEdit={() => setEditing(room)}
              />
            </li>
          ))}
        </CardRows>
      )}

      <Dialog
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? editing.name : t.newRoom}
        closeLabel={d.panel.common.close}
      >
        {creating || editing ? (
          <RoomForm
            key={editing?.id ?? "new"}
            propertyId={propertyId}
            room={editing ?? undefined}
            onDone={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        ) : null}
      </Dialog>
    </SectionCard>
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
  const { d, locale } = useI18n();
  const misc = d.panel.panelMisc;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vacant = !room.tenantId;

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
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3 lg:gap-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
            vacant ? "bg-info-soft text-info" : "bg-accent-soft text-accent",
          )}
          aria-hidden
        >
          {vacant ? <DoorOpen className="size-[18px]" /> : <BedDouble className="size-[18px]" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{room.name}</span>
          {room.tenantId ? (
            <Link
              href={`/panel/najemcy/${room.tenantId}`}
              className="block truncate text-[13px] text-muted hover:text-fg hover:underline"
            >
              {room.tenantName}
            </Link>
          ) : (
            <span className="block text-[13px] font-[550] text-info">
              {rentalStatusLabels(d)[room.status]}
            </span>
          )}
        </span>

        {room.monthlyRentGrosze ? (
          <span className="font-mono text-sm font-semibold whitespace-nowrap text-fg">
            {formatMoney(room.monthlyRentGrosze, locale)}
          </span>
        ) : (
          <span className="text-[13px] text-subtle">{misc.roomNoPrice}</span>
        )}

        <span className="flex shrink-0 items-center gap-1">
          {room.tenantId && room.leaseId ? (
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link href={`/panel/umowy/${room.leaseId}`}>{misc.roomLease}</Link>
            </Button>
          ) : !disabled ? (
            <Button asChild size="sm" variant="soft">
              <Link
                href={`/panel/umowy/nowa?propertyId=${propertyId}&roomId=${room.id}`}
                title={fill(misc.roomAssignTitle, { room: room.name, property: propertyName })}
              >
                <UserPlus className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{misc.roomAssign}</span>
              </Link>
            </Button>
          ) : null}

          <ActionMenu
            label={fill(misc.roomEdit, { room: room.name })}
            items={[
              ...(room.tenantId && room.leaseId
                ? [{ label: misc.roomLease, href: `/panel/umowy/${room.leaseId}` }]
                : []),
              { label: d.panel.common.edit, icon: Pencil, onSelect: onEdit },
              {
                label: fill(misc.roomDelete, { room: room.name }),
                icon: busy ? Loader2 : Trash2,
                danger: true,
                disabled: busy,
                onSelect: remove,
              },
            ]}
          />
        </span>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

function RoomForm({
  propertyId,
  room,
  onDone,
}: {
  propertyId: string;
  room?: RoomView;
  onDone: () => void;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.roomsPanel;
  const v = useValidationContext();
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
    resolver: zodResolver(roomFormSchema(v)),
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <DialogBody>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormField id={idFor("name")} label={t.designation} error={errors.name?.message}>
          <Input
            {...fieldAria(idFor("name"), { error: errors.name?.message })}
            disabled={isSubmitting}
            {...register("name")}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={idFor("status")} label={t.status} error={errors.status?.message}>
            <Select
              {...fieldAria(idFor("status"), { error: errors.status?.message })}
              disabled={isSubmitting}
              {...register("status")}
            >
              {Object.entries(rentalStatusLabels(d)).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id={idFor("rent")} label={t.rent} error={errors.monthlyRentGrosze?.message}>
            <div className="relative">
              <Input
                {...fieldAria(idFor("rent"), { error: errors.monthlyRentGrosze?.message })}
                inputMode="decimal"
                placeholder="0,00"
                className="pr-10 font-mono"
                disabled={isSubmitting}
                {...register("monthlyRentGrosze")}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
                {formatMoneyParts(0, locale).currency}
              </span>
            </div>
          </FormField>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={isSubmitting}>
          {d.panel.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? d.panel.common.save : t.add}
        </Button>
      </DialogFooter>
    </form>
  );
}

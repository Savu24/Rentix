"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { formatAmount } from "@/lib/money";
import {
  LEASE_SETTABLE_STATUSES,
  LEASE_STATUS_LABEL,
  UTILITIES_MODE_HINT,
  UTILITIES_MODE_INCOMPLETE,
  UTILITIES_MODE_LABEL,
  leaseFormSchema,
  type LeaseFormInput,
  type LeaseFormOutput,
} from "@/lib/validations/lease";

export type RoomOption = {
  id: string;
  name: string;
  status: string;
  monthlyRentGrosze: number | null;
};

export type PropertyOption = {
  id: string;
  label: string;
  city: string;
  status: string;
  askingRentGrosze: number | null;
  rooms: RoomOption[];
};

export type TenantOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
};

const EMPTY: LeaseFormInput = {
  propertyId: "",
  roomId: "",
  tenantIds: [],
  number: "",
  status: "DRAFT",
  startDate: "",
  endDate: "",
  rentGrosze: "",
  depositGrosze: "",
  utilitiesMode: "FLAT_RATE",
  utilitiesAdvanceGrosze: "",
  billingDay: 1,
  billingStartsAt: "",
  paymentTermDays: 10,
  sendInvoicesByEmail: true,
  notes: "",
};

export function LeaseForm({
  properties,
  tenants,
  preset,
}: {
  properties: PropertyOption[];
  tenants: TenantOption[];
  /** Wstępny wybór — z przycisku „Przypisz” przy pokoju albo z karty najemcy. */
  preset?: { propertyId?: string; roomId?: string; tenantId?: string };
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const presetProperty = properties.find((property) => property.id === preset?.propertyId);
  const presetRoom = presetProperty?.rooms.find((room) => room.id === preset?.roomId);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeaseFormInput, unknown, LeaseFormOutput>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      ...EMPTY,
      propertyId: presetProperty?.id ?? "",
      roomId: presetRoom?.id ?? "",
      tenantIds: tenants.some((tenant) => tenant.id === preset?.tenantId)
        ? [preset!.tenantId!]
        : [],
      // Czynsz z pokoju ma pierwszeństwo przed ceną za całość — przy najmie
      // pokojowym to on jest właściwą kwotą.
      rentGrosze: presetRoom?.monthlyRentGrosze
        ? formatAmount(presetRoom.monthlyRentGrosze)
        : presetProperty?.askingRentGrosze
          ? formatAmount(presetProperty.askingRentGrosze)
          : "",
    },
  });

  const selectedTenantIds = watch("tenantIds") ?? [];
  const utilitiesMode = watch("utilitiesMode");
  const chargesAdvance = utilitiesMode === "FLAT_RATE" || utilitiesMode === "MIXED";

  const selectedPropertyId = watch("propertyId");
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId);
  const availableRooms = selectedProperty?.rooms ?? [];

  const selectedTenants = selectedTenantIds
    .map((id) => tenants.find((tenant) => tenant.id === id))
    .filter((tenant): tenant is TenantOption => Boolean(tenant));

  const availableTenants = tenants.filter((tenant) => !selectedTenantIds.includes(tenant.id));

  /**
   * Wybór jednostki podpowiada czynsz i kaucję z ceny wywoławczej.
   * Nadpisujemy tylko puste pola — jeśli użytkownik już coś wpisał,
   * podpowiedź nie może mu tego skasować.
   */
  function onPropertyChange(propertyId: string) {
    setValue("propertyId", propertyId, { shouldValidate: true });
    // Pokój z poprzedniej nieruchomości przestaje istnieć w nowym kontekście.
    setValue("roomId", "");

    const property = properties.find((entry) => entry.id === propertyId);
    if (!property?.askingRentGrosze) return;

    const suggestion = formatAmount(property.askingRentGrosze);
    if (!watch("rentGrosze")) setValue("rentGrosze", suggestion);
    if (!watch("depositGrosze")) setValue("depositGrosze", suggestion);
  }

  /** Wybór pokoju nadpisuje podpowiedź czynszu — pokój ma własną stawkę. */
  function onRoomChange(roomId: string) {
    setValue("roomId", roomId, { shouldValidate: true });

    const room = availableRooms.find((entry) => entry.id === roomId);
    if (room?.monthlyRentGrosze) {
      setValue("rentGrosze", formatAmount(room.monthlyRentGrosze));
    }
  }

  /**
   * Na serwer lecą surowe wartości pól, a nie wynik resolvera.
   *
   * API waliduje tym samym schematem, więc transformacje muszą się wykonać
   * dokładnie raz. Wysłanie wyniku walidacji z przeglądarki dawało datę jako
   * `Date` (w JSON-ie „2026-08-17T00:00:00.000Z", czego `dateInput` nie
   * przyjmuje) i kwotę już w groszach, którą `moneyInput` mnożył przez 100
   * drugi raz.
   */
  async function onSubmit() {
    setFormError(null);

    const result = await api.post<{ id: string }>("/api/leases", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof LeaseFormInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    router.push(`/panel/umowy/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Przedmiot i strony</h2>

          <FormField
            id="propertyId"
            label="Nieruchomość"
            error={errors.propertyId?.message}
            hint="Wybór nieruchomości podpowie czynsz z ceny wywoławczej."
          >
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select
                  {...fieldAria("propertyId", { error: errors.propertyId?.message })}
                  value={field.value}
                  onChange={(event) => onPropertyChange(event.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Wybierz nieruchomość</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.label}
                      {property.city ? ` · ${property.city}` : ""}
                      {property.status === "OCCUPIED" ? " (wynajęta)" : ""}
                    </option>
                  ))}
                </Select>
              )}
            />
          </FormField>

          {availableRooms.length > 0 ? (
            <FormField
              id="roomId"
              label="Pokój"
              error={errors.roomId?.message}
              hint="Zostaw puste, jeśli wynajmujesz całą nieruchomość jednej osobie lub grupie."
            >
              <Controller
                control={control}
                name="roomId"
                render={({ field }) => (
                  <Select
                    {...fieldAria("roomId", { error: errors.roomId?.message })}
                    value={field.value ?? ""}
                    onChange={(event) => onRoomChange(event.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">Cała nieruchomość</option>
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                        {room.status === "OCCUPIED" ? " (zajęty)" : ""}
                        {room.monthlyRentGrosze
                          ? ` · ${formatAmount(room.monthlyRentGrosze)} zł`
                          : ""}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </FormField>
          ) : null}

          <FormField
            id="tenantIds"
            label="Najemcy"
            error={errors.tenantIds?.message}
            hint="Pierwszy z listy jest głównym najemcą. To on dostaje faktury."
          >
            <Controller
              control={control}
              name="tenantIds"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {selectedTenants.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedTenants.map((tenant, index) => (
                        <span
                          key={tenant.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                        >
                          {index === 0 ? <Badge tone="accent">główny</Badge> : null}
                          {tenant.firstName} {tenant.lastName}
                          <button
                            type="button"
                            aria-label={`Usuń ${tenant.firstName} ${tenant.lastName}`}
                            onClick={() =>
                              field.onChange(field.value.filter((id) => id !== tenant.id))
                            }
                            className="rounded-full hover:opacity-70"
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Select
                    {...fieldAria("tenantIds", { error: errors.tenantIds?.message })}
                    value=""
                    onChange={(event) => {
                      if (event.target.value) field.onChange([...field.value, event.target.value]);
                    }}
                    disabled={isSubmitting || availableTenants.length === 0}
                  >
                    <option value="">
                      {availableTenants.length === 0
                        ? "Wszyscy najemcy dodani"
                        : "Dodaj najemcę"}
                    </option>
                    {availableTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                        {tenant.email ? ` · ${tenant.email}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            />
          </FormField>

          {/* Podgląd danych, które trafią na umowę i faktury — żeby braki
              w profilu najemcy było widać zanim wygenerujemy PDF. */}
          {selectedTenants.length > 0 ? (
            <div className="rounded-control bg-surface-alt p-3 text-xs">
              <p className="mb-1.5 font-semibold text-fg">Dane na umowę</p>
              {selectedTenants.map((tenant) => {
                const address = [tenant.street, [tenant.postalCode, tenant.city].filter(Boolean).join(" ")]
                  .filter((part) => part && part.trim() !== "")
                  .join(", ");
                return (
                  <p key={tenant.id} className="text-muted">
                    {tenant.firstName} {tenant.lastName}:{" "}
                    {address || (
                      <span className="text-warn">
                        brak adresu, uzupełnij w karcie najemcy
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Okres i status</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="startDate" label="Data rozpoczęcia" error={errors.startDate?.message}>
              <DateInput
                {...fieldAria("startDate", { error: errors.startDate?.message })}
                disabled={isSubmitting}
                {...register("startDate")}
              />
            </FormField>

            <FormField
              id="endDate"
              label="Data zakończenia"
              error={errors.endDate?.message}
              hint="Puste = czas nieokreślony."
            >
              <DateInput
                {...fieldAria("endDate", { error: errors.endDate?.message })}
                disabled={isSubmitting}
                {...register("endDate")}
              />
            </FormField>

            <FormField id="status" label="Status" error={errors.status?.message}>
              <Select
                {...fieldAria("status", { error: errors.status?.message })}
                disabled={isSubmitting}
                {...register("status")}
              >
                {LEASE_SETTABLE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {LEASE_STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="number"
              label="Numer umowy"
              error={errors.number?.message}
              hint="Opcjonalny."
            >
              <Input
                {...fieldAria("number", { error: errors.number?.message })}
                disabled={isSubmitting}
                {...register("number")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Czynsz i rozliczenia</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rentGrosze" label="Czynsz miesięczny" error={errors.rentGrosze?.message}>
              <Input
                {...fieldAria("rentGrosze", { error: errors.rentGrosze?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("rentGrosze")}
              />
            </FormField>

            <FormField id="depositGrosze" label="Kaucja" error={errors.depositGrosze?.message}>
              <Input
                {...fieldAria("depositGrosze", { error: errors.depositGrosze?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("depositGrosze")}
              />
            </FormField>

            <FormField
              id="utilitiesMode"
              label="Rozliczenie mediów"
              error={errors.utilitiesMode?.message}
              hint={UTILITIES_MODE_HINT[utilitiesMode ?? "FLAT_RATE"]}
            >
              <Select
                {...fieldAria("utilitiesMode", { error: errors.utilitiesMode?.message })}
                disabled={isSubmitting}
                {...register("utilitiesMode")}
              >
                {Object.entries(UTILITIES_MODE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Ostrzeżenie w momencie wyboru trybu, a nie dopiero przy
                fakturze — wtedy zaniżony dokument już poszedł do najemcy. */}
            {utilitiesMode && UTILITIES_MODE_INCOMPLETE[utilitiesMode] ? (
              <div className="sm:col-span-2">
                <Alert tone="warning">{UTILITIES_MODE_INCOMPLETE[utilitiesMode]}</Alert>
              </div>
            ) : null}

            {chargesAdvance ? (
              <FormField
                id="utilitiesAdvanceGrosze"
                label="Zaliczka na media"
                error={errors.utilitiesAdvanceGrosze?.message}
              >
                <Input
                  {...fieldAria("utilitiesAdvanceGrosze", {
                    error: errors.utilitiesAdvanceGrosze?.message,
                  })}
                  inputMode="decimal"
                  disabled={isSubmitting}
                  {...register("utilitiesAdvanceGrosze")}
                />
              </FormField>
            ) : null}

            <FormField
              id="billingDay"
              label="Dzień naliczania"
              error={errors.billingDay?.message}
              hint="1–28, żeby luty nie wymagał wyjątku."
            >
              <Input
                {...fieldAria("billingDay", { error: errors.billingDay?.message })}
                type="number"
                min={1}
                max={28}
                disabled={isSubmitting}
                {...register("billingDay")}
              />
            </FormField>

            {/*
              Pole stoi przy dniu naliczania, a nie przy datach umowy: dotyczy
              rozliczeń, nie okresu najmu — umowa trwa od swojej daty początku
              niezależnie od tego, od kiedy wystawiamy dokumenty.
            */}
            <FormField
              id="billingStartsAt"
              label="Nie naliczaj przed"
              error={errors.billingStartsAt?.message}
              hint="Dla umów przeniesionych z innego programu. Wpisz pierwszy dzień miesiąca, od którego rozliczasz najemcę w Rentiksie. Puste = od początku umowy."
            >
              <DateInput
                {...fieldAria("billingStartsAt", { error: errors.billingStartsAt?.message })}
                disabled={isSubmitting}
                {...register("billingStartsAt")}
              />
            </FormField>

            <FormField
              id="paymentTermDays"
              label="Termin płatności (dni)"
              error={errors.paymentTermDays?.message}
            >
              <Input
                {...fieldAria("paymentTermDays", { error: errors.paymentTermDays?.message })}
                type="number"
                min={0}
                max={90}
                disabled={isSubmitting}
                {...register("paymentTermDays")}
              />
            </FormField>
          </div>

          {/*
            Przelacznik stoi przy polach rozliczeniowych, a nie w ustawieniach
            konta: decyzja zapada przy konkretnym najemcy, ktory prosi
            o papier — nie przy calym portfelu naraz.
          */}
          <CheckboxField
            label="Wysyłaj rachunki mailem"
            hint="Wyłącz, jeśli ten najemca ma dostawać dokumenty poza systemem. Ręczna wysyłka z widoku rachunku pozostaje dostępna."
            disabled={isSubmitting}
            {...register("sendInvoicesByEmail")}
          />

          <FormField id="notes" label="Ustalenia dodatkowe" error={errors.notes?.message}>
            <Textarea
              {...fieldAria("notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Zapisywanie…
            </>
          ) : (
            "Utwórz umowę"
          )}
        </Button>
        <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

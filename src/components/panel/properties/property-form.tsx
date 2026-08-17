"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OwnerPicker, type OwnerOption } from "@/components/panel/owners/owner-picker";
import { api } from "@/lib/api/client";
import {
  MAX_ROOMS_PER_PROPERTY,
  PROPERTY_TYPE_LABEL,
  propertyCreateSchema,
  type PropertyCreateInput,
  type PropertyCreateOutput,
} from "@/lib/validations/property";

type Props = {
  /** Podany = edycja istniejącej nieruchomości (bez pola liczby pokoi). */
  propertyId?: string;
  defaultValues?: Partial<PropertyCreateInput>;
  owners: OwnerOption[];
};

const EMPTY: PropertyCreateInput = {
  name: "",
  type: "APARTMENT",
  ownerId: "",
  roomCount: "",
  street: "",
  buildingNumber: "",
  apartmentNumber: "",
  postalCode: "",
  city: "",
  district: "",
  areaM2: "",
  floor: "",
  askingRentGrosze: "",
  description: "",
  notes: "",
  publiclyListed: false,
};

export function PropertyForm({ propertyId, defaultValues, owners }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(propertyId);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PropertyCreateInput, unknown, PropertyCreateOutput>({
    // Jeden schemat w obu trybach — `roomCount` jest opcjonalny i domyślnie 0.
    // Przy edycji pole po prostu się nie renderuje, a `propertyUpdateSchema`
    // po stronie API i tak je odrzuca.
    resolver: zodResolver(propertyCreateSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const ownerId = watch("ownerId") ?? "";

  /**
   * Surowe wartości pól, nie wynik resolvera — API waliduje tym samym
   * schematem, więc kwota przetworzona już w przeglądarce zostałaby
   * pomnożona przez 100 drugi raz.
   */
  async function onSubmit() {
    setFormError(null);
    const values = getValues();

    const result = isEdit
      ? await api.patch<{ id: string }>(`/api/properties/${propertyId}`, values)
      : await api.post<{ id: string; _count: { rooms: number } }>("/api/properties", values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field in EMPTY && messages[0]) {
          setError(field as keyof PropertyCreateInput, { message: messages[0] });
        }
      }
      setFormError(result.message);
      return;
    }

    if (isEdit) {
      router.push(`/panel/nieruchomosci/${propertyId}`);
    } else {
      const created = result.data as { id: string; _count: { rooms: number } };
      // Z pokojami idziemy do kroku z cenami; bez pokoi nie ma czego wyceniać.
      router.push(
        created._count.rooms > 0
          ? `/panel/nieruchomosci/${created.id}/pokoje`
          : `/panel/nieruchomosci/${created.id}`,
      );
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Podstawowe dane</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="name"
              label="Nazwa"
              error={errors.name?.message}
              hint="Robocza nazwa, po której rozpoznasz obiekt na liście."
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("name", { error: errors.name?.message })}
                placeholder="Kwiatowa 4"
                disabled={isSubmitting}
                {...register("name")}
              />
            </FormField>

            <FormField id="type" label="Typ" error={errors.type?.message}>
              <Select
                {...fieldAria("type", { error: errors.type?.message })}
                disabled={isSubmitting}
                {...register("type")}
              >
                {Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            {!isEdit ? (
              <FormField
                id="roomCount"
                label="Liczba pokoi"
                error={errors.roomCount?.message}
                hint="Pokoje utworzą się od razu — w następnym kroku wpiszesz ceny."
              >
                <Input
                  {...fieldAria("roomCount", { error: errors.roomCount?.message })}
                  type="number"
                  min={0}
                  max={MAX_ROOMS_PER_PROPERTY}
                  placeholder="3"
                  disabled={isSubmitting}
                  {...register("roomCount")}
                />
              </FormField>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Właściciel</h2>
          <p className="-mt-2 text-xs text-muted">
            Dotyczy podnajmu i zarządzania cudzym lokalem. Przy własnej nieruchomości zostaw
            „nieruchomość własna”.
          </p>

          <OwnerPicker
            owners={owners}
            value={ownerId}
            onChange={(value) => setValue("ownerId", value, { shouldValidate: true })}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Adres</h2>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="street"
              label="Ulica"
              error={errors.street?.message}
              className="sm:col-span-3"
            >
              <Input
                {...fieldAria("street", { error: errors.street?.message })}
                autoComplete="address-line1"
                placeholder="Kwiatowa"
                disabled={isSubmitting}
                {...register("street")}
              />
            </FormField>

            <FormField
              id="buildingNumber"
              label="Nr budynku"
              error={errors.buildingNumber?.message}
              className="sm:col-span-1"
            >
              <Input
                {...fieldAria("buildingNumber", { error: errors.buildingNumber?.message })}
                placeholder="4"
                disabled={isSubmitting}
                {...register("buildingNumber")}
              />
            </FormField>

            <FormField
              id="apartmentNumber"
              label="Nr mieszkania"
              error={errors.apartmentNumber?.message}
              hint="Zostaw puste przy domu."
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("apartmentNumber", { error: errors.apartmentNumber?.message })}
                placeholder="2"
                disabled={isSubmitting}
                {...register("apartmentNumber")}
              />
            </FormField>

            <FormField
              id="postalCode"
              label="Kod pocztowy"
              error={errors.postalCode?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("postalCode", { error: errors.postalCode?.message })}
                autoComplete="postal-code"
                placeholder="30-001"
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("postalCode")}
              />
            </FormField>

            <FormField
              id="city"
              label="Miejscowość"
              error={errors.city?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("city", { error: errors.city?.message })}
                autoComplete="address-level2"
                placeholder="Kraków"
                disabled={isSubmitting}
                {...register("city")}
              />
            </FormField>

            <FormField
              id="district"
              label="Dzielnica"
              error={errors.district?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("district", { error: errors.district?.message })}
                placeholder="Podgórze"
                disabled={isSubmitting}
                {...register("district")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Metraż i czynsz</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="areaM2" label="Powierzchnia (m²)" error={errors.areaM2?.message}>
              <Input
                {...fieldAria("areaM2", { error: errors.areaM2?.message })}
                inputMode="decimal"
                placeholder="48,50"
                disabled={isSubmitting}
                {...register("areaM2")}
              />
            </FormField>

            <FormField id="floor" label="Piętro" error={errors.floor?.message}>
              <Input
                {...fieldAria("floor", { error: errors.floor?.message })}
                inputMode="numeric"
                placeholder="1"
                disabled={isSubmitting}
                {...register("floor")}
              />
            </FormField>

            <FormField
              id="askingRentGrosze"
              label="Czynsz za całość"
              error={errors.askingRentGrosze?.message}
              hint="Przy najmie pokojowym stawki wpisujesz przy pokojach."
            >
              <Input
                {...fieldAria("askingRentGrosze", { error: errors.askingRentGrosze?.message })}
                inputMode="decimal"
                placeholder="2 400,00"
                disabled={isSubmitting}
                {...register("askingRentGrosze")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Opis i notatki</h2>

          <FormField
            id="description"
            label="Opis"
            error={errors.description?.message}
            hint="Widoczny na publicznej stronie ofert, jeśli ją włączysz."
          >
            <Textarea
              {...fieldAria("description", { error: errors.description?.message })}
              placeholder="Dwupokojowe mieszkanie po remoncie, blisko tramwaju…"
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <FormField
            id="notes"
            label="Notatki wewnętrzne"
            error={errors.notes?.message}
            hint="Widoczne tylko dla Ciebie — najemca ich nie zobaczy."
          >
            <Textarea
              {...fieldAria("notes", { error: errors.notes?.message })}
              placeholder="Kod do klatki, kontakt do administracji…"
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

          <CheckboxField
            label="Pokazuj na publicznej stronie ofert"
            hint="Wolne pokoje będą widoczne pod adresem Twojej organizacji."
            disabled={isSubmitting}
            {...register("publiclyListed")}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Zapisywanie…
            </>
          ) : isEdit ? (
            "Zapisz zmiany"
          ) : (
            <>
              Kontynuuj
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.back()}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}

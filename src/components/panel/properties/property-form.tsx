"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Building,
  Building2,
  ClipboardCheck,
  KeyRound,
  Loader2,
  MapPin,
  NotebookPen,
  Ruler,
  TrainFront,
  UserRound,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/panel/form-section";
import { OwnerPicker, type OwnerOption } from "@/components/panel/owners/owner-picker";
import { api } from "@/lib/api/client";
import {
  heatingTypeLabels,
  MAX_ROOMS_PER_PROPERTY,
  PROPERTY_SETTABLE_STATUSES,
  propertyTypeLabels,
  rentalStatusLabels,
  propertyCreateSchema,
  type PropertyCreateInput,
  type PropertyCreateOutput,
} from "@/lib/validations/property";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
type Props = {
  /** Podany = edycja istniejącej nieruchomości (bez pola liczby pokoi). */
  propertyId?: string;
  defaultValues?: Partial<PropertyCreateInput>;
  owners: OwnerOption[];
};

const EMPTY: PropertyCreateInput = {
  name: "",
  type: "APARTMENT",
  status: "AVAILABLE",
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
  // Bez pola w formularzu, ale wartość jedzie dalej: przy edycji nadpisanie
  // pustką skasowałoby czynsz wpisany, zanim pole zniknęło.
  askingRentGrosze: "",
  intercomCode: "",
  storageUnit: "",
  bikeStorage: "",
  wasteDisposal: "",
  buildingManagerName: "",
  buildingManagerAddress: "",
  buildingManagerPhone: "",
  buildingManagerEmail: "",
  heatingType: "",
  internetProvider: "",
  internetProviderPhone: "",
  internetSpeedMbps: "",
  wifiSsid: "",
  wifiPassword: "",
  internetContractEndsAt: "",
  landRegistryNumber: "",
  transitLines: "",
  nearbyPlaces: "",
  description: "",
  notes: "",
  publiclyListed: false,
};

export function PropertyForm({ propertyId, defaultValues, owners }: Props) {
  const { d } = useI18n();
  const t = d.panel.propertiesPage.form;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(propertyId);

  // Wynajętej nieruchomości nie przestawia się z ręki — status pilnuje umowa,
  // więc strona edycji nie podaje wtedy wartości i pole się nie renderuje.
  const canSetStatus = !isEdit || Boolean(defaultValues?.status);

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
    resolver: zodResolver(propertyCreateSchema(v)),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const ownerId = watch("ownerId") ?? "";
  const ownerSummary = ownerId
    ? (owners.find((owner) => owner.id === ownerId)?.name ?? null)
    : d.panel.ownersPage.picker.own;

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
          setError(field as keyof PropertyCreateInput, {
            message: messages[0],
          });
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormSection title={t.sectionBasics} icon={Building2} collapsible={false}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="name"
              label={t.name}
              error={errors.name?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("name", { error: errors.name?.message })}
                disabled={isSubmitting}
                {...register("name")}
              />
            </FormField>

            <FormField id="type" label={t.type} error={errors.type?.message}>
              <Select
                {...fieldAria("type", { error: errors.type?.message })}
                disabled={isSubmitting}
                {...register("type")}
              >
                {Object.entries(propertyTypeLabels(d)).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            {canSetStatus ? (
              <FormField
                id="status"
                label={t.status}
                error={errors.status?.message}
              >
                <Select
                  {...fieldAria("status", { error: errors.status?.message })}
                  disabled={isSubmitting}
                  {...register("status")}
                >
                  {PROPERTY_SETTABLE_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {rentalStatusLabels(d)[value]}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}

            {!isEdit ? (
              <FormField
                id="roomCount"
                label={t.roomCount}
                error={errors.roomCount?.message}
              >
                <Input
                  {...fieldAria("roomCount", {
                    error: errors.roomCount?.message,
                  })}
                  type="number"
                  min={0}
                  max={MAX_ROOMS_PER_PROPERTY}
                  disabled={isSubmitting}
                  {...register("roomCount")}
                />
              </FormField>
            ) : null}
          </div>
        </FormSection>

      <FormSection title={d.panel.panelMisc.sectionOwner} icon={UserRound} summary={ownerSummary}>

          <OwnerPicker
            owners={owners}
            value={ownerId}
            onChange={(value) => setValue("ownerId", value, { shouldValidate: true })}
            disabled={isSubmitting}
          />
        </FormSection>

      <FormSection title={d.panel.panelMisc.sectionAddress} icon={MapPin} defaultOpen>

          <div className="grid gap-4 sm:grid-cols-6">
            <FormField
              id="street"
              label={t.street}
              error={errors.street?.message}
              className="sm:col-span-3"
            >
              <Input
                {...fieldAria("street", { error: errors.street?.message })}
                autoComplete="address-line1"
                disabled={isSubmitting}
                {...register("street")}
              />
            </FormField>

            <FormField
              id="buildingNumber"
              label={t.buildingNumber}
              error={errors.buildingNumber?.message}
              className="sm:col-span-1"
            >
              <Input
                {...fieldAria("buildingNumber", {
                  error: errors.buildingNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("buildingNumber")}
              />
            </FormField>

            <FormField
              id="apartmentNumber"
              label={t.apartmentNumber}
              error={errors.apartmentNumber?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("apartmentNumber", {
                  error: errors.apartmentNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("apartmentNumber")}
              />
            </FormField>

            <FormField
              id="postalCode"
              label={t.postalCode}
              error={errors.postalCode?.message}
              className="sm:col-span-2"
            >
              <PostalCodeInput
                {...fieldAria("postalCode", {
                  error: errors.postalCode?.message,
                })}
                disabled={isSubmitting}
                {...register("postalCode")}
              />
            </FormField>

            <FormField
              id="city"
              label={t.city}
              error={errors.city?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("city", { error: errors.city?.message })}
                autoComplete="address-level2"
                disabled={isSubmitting}
                {...register("city")}
              />
            </FormField>

            <FormField
              id="district"
              label={t.district}
              error={errors.district?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("district", { error: errors.district?.message })}
                disabled={isSubmitting}
                {...register("district")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={d.panel.panelMisc.sectionArea} icon={Ruler}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="areaM2" label={t.area} error={errors.areaM2?.message}>
              <Input
                {...fieldAria("areaM2", { error: errors.areaM2?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("areaM2")}
              />
            </FormField>

            <FormField id="floor" label={t.floor} error={errors.floor?.message}>
              <Input
                {...fieldAria("floor", { error: errors.floor?.message })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("floor")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionAccess} icon={KeyRound}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="intercomCode"
              label={t.intercom}
              error={errors.intercomCode?.message}
            >
              <Input
                {...fieldAria("intercomCode", {
                  error: errors.intercomCode?.message,
                })}
                disabled={isSubmitting}
                {...register("intercomCode")}
              />
            </FormField>

            <FormField
              id="storageUnit"
              label={t.storage}
              error={errors.storageUnit?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("storageUnit", {
                  error: errors.storageUnit?.message,
                })}
                disabled={isSubmitting}
                {...register("storageUnit")}
              />
            </FormField>

            <FormField
              id="bikeStorage"
              label={t.bikeStorage}
              error={errors.bikeStorage?.message}
            >
              <Input
                {...fieldAria("bikeStorage", {
                  error: errors.bikeStorage?.message,
                })}
                disabled={isSubmitting}
                {...register("bikeStorage")}
              />
            </FormField>

            <FormField id="wasteDisposal" label={t.waste} error={errors.wasteDisposal?.message}>
              <Input
                {...fieldAria("wasteDisposal", {
                  error: errors.wasteDisposal?.message,
                })}
                disabled={isSubmitting}
                {...register("wasteDisposal")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionManager} icon={Building}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="buildingManagerName"
              label={t.managerName}
              error={errors.buildingManagerName?.message}
            >
              <Input
                {...fieldAria("buildingManagerName", {
                  error: errors.buildingManagerName?.message,
                })}
                disabled={isSubmitting}
                {...register("buildingManagerName")}
              />
            </FormField>

            <FormField
              id="buildingManagerAddress"
              label={t.managerAddress}
              error={errors.buildingManagerAddress?.message}
            >
              <Input
                {...fieldAria("buildingManagerAddress", {
                  error: errors.buildingManagerAddress?.message,
                })}
                disabled={isSubmitting}
                {...register("buildingManagerAddress")}
              />
            </FormField>

            <FormField
              id="buildingManagerPhone"
              label={t.managerPhone}
              error={errors.buildingManagerPhone?.message}
            >
              <Input
                {...fieldAria("buildingManagerPhone", {
                  error: errors.buildingManagerPhone?.message,
                })}
                type="tel"
                disabled={isSubmitting}
                {...register("buildingManagerPhone")}
              />
            </FormField>

            <FormField
              id="buildingManagerEmail"
              label={t.managerEmail}
              error={errors.buildingManagerEmail?.message}
            >
              <Input
                {...fieldAria("buildingManagerEmail", {
                  error: errors.buildingManagerEmail?.message,
                })}
                type="email"
                disabled={isSubmitting}
                {...register("buildingManagerEmail")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionUtilities} icon={Wifi}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="heatingType"
              label={t.heating}
              error={errors.heatingType?.message}
            >
              <Select
                {...fieldAria("heatingType", {
                  error: errors.heatingType?.message,
                })}
                disabled={isSubmitting}
                {...register("heatingType")}
              >
                <option value="">{t.notSet}</option>
                {Object.entries(heatingTypeLabels(d)).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="internetSpeedMbps"
              label={t.internetSpeed}
              error={errors.internetSpeedMbps?.message}
            >
              <Input
                {...fieldAria("internetSpeedMbps", {
                  error: errors.internetSpeedMbps?.message,
                })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("internetSpeedMbps")}
              />
            </FormField>

            <FormField
              id="internetProvider"
              label={t.internetProvider}
              error={errors.internetProvider?.message}
            >
              <Input
                {...fieldAria("internetProvider", {
                  error: errors.internetProvider?.message,
                })}
                disabled={isSubmitting}
                {...register("internetProvider")}
              />
            </FormField>

            <FormField
              id="internetProviderPhone"
              label={t.internetProviderPhone}
              error={errors.internetProviderPhone?.message}
            >
              <Input
                {...fieldAria("internetProviderPhone", {
                  error: errors.internetProviderPhone?.message,
                })}
                type="tel"
                disabled={isSubmitting}
                {...register("internetProviderPhone")}
              />
            </FormField>

            <FormField id="wifiSsid" label={t.wifiSsid} error={errors.wifiSsid?.message}>
              <Input
                {...fieldAria("wifiSsid", { error: errors.wifiSsid?.message })}
                disabled={isSubmitting}
                {...register("wifiSsid")}
              />
            </FormField>

            <FormField
              id="wifiPassword"
              label={t.wifiPassword}
              error={errors.wifiPassword?.message}
            >
              <Input
                {...fieldAria("wifiPassword", {
                  error: errors.wifiPassword?.message,
                })}
                disabled={isSubmitting}
                {...register("wifiPassword")}
              />
            </FormField>

            <FormField
              id="internetContractEndsAt"
              label={t.internetContractEnd}
              error={errors.internetContractEndsAt?.message}
            >
              <DateInput
                {...fieldAria("internetContractEndsAt", {
                  error: errors.internetContractEndsAt?.message,
                })}

                disabled={isSubmitting}
                {...register("internetContractEndsAt")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionPapers} icon={ClipboardCheck}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="landRegistryNumber"
              label={t.landRegistry}
              error={errors.landRegistryNumber?.message}
            >
              <Input
                {...fieldAria("landRegistryNumber", {
                  error: errors.landRegistryNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("landRegistryNumber")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionArea} icon={TrainFront}>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="transitLines"
              label={t.transitLines}
              error={errors.transitLines?.message}
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("transitLines", {
                  error: errors.transitLines?.message,
                })}
                disabled={isSubmitting}
                {...register("transitLines")}
              />
            </FormField>

            <FormField
              id="nearbyPlaces"
              label={t.nearbyPlaces}
              error={errors.nearbyPlaces?.message}
              className="sm:col-span-2"
            >
              <Textarea
                {...fieldAria("nearbyPlaces", {
                  error: errors.nearbyPlaces?.message,
                })}
                disabled={isSubmitting}
                {...register("nearbyPlaces")}
              />
            </FormField>
          </div>
        </FormSection>

      <FormSection title={t.sectionNotes} icon={NotebookPen}>

          <FormField
            id="description"
            label={t.description}
            error={errors.description?.message}
          >
            <Textarea
              {...fieldAria("description", {
                error: errors.description?.message,
              })}
              disabled={isSubmitting}
              {...register("description")}
            />
          </FormField>

          <FormField
            id="notes"
            label={t.notes}
            error={errors.notes?.message}
          >
            <Textarea
              {...fieldAria("notes", { error: errors.notes?.message })}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </FormField>

        </FormSection>

      <section className="flex min-h-16 items-center rounded-tile border border-border bg-surface px-4 lg:rounded-card lg:px-6">
        <CheckboxField
          label={t.publiclyListed}
          disabled={isSubmitting}
          {...register("publiclyListed")}
        />
      </section>

      <div className="flex flex-row-reverse flex-wrap justify-start gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t.saving}
            </>
          ) : isEdit ? (
            d.panel.common.saveChanges
          ) : (
            <>
              {t.continueLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => router.back()}
        >
          {d.panel.common.cancel}
        </Button>
      </div>
    </form>
  );
}

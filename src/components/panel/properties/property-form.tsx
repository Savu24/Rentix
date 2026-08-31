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
import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OwnerPicker, type OwnerOption } from "@/components/panel/owners/owner-picker";
import { api } from "@/lib/api/client";
import {
  HEATING_TYPE_LABEL,
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
  // Bez pola w formularzu, ale wartość jedzie dalej: przy edycji nadpisanie
  // pustką skasowałoby czynsz wpisany, zanim pole zniknęło.
  askingRentGrosze: "",
  intercomCode: "",
  checkoutTime: "",
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
  energyCertificateEp: "",
  energyCertificateExpiresAt: "",
  boilerModel: "",
  boilerInspectionAt: "",
  technicalInspectionAt: "",
  gpsCoordinates: "",
  transitLines: "",
  transitStopDistanceM: "",
  universityDistanceM: "",
  nearbyPlaces: "",
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
                {...fieldAria("buildingNumber", {
                  error: errors.buildingNumber?.message,
                })}
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
                {...fieldAria("apartmentNumber", {
                  error: errors.apartmentNumber?.message,
                })}
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
              label="Miejscowość"
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
              label="Dzielnica"
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Metraż</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="areaM2" label="Powierzchnia (m²)" error={errors.areaM2?.message}>
              <Input
                {...fieldAria("areaM2", { error: errors.areaM2?.message })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("areaM2")}
              />
            </FormField>

            <FormField id="floor" label="Piętro" error={errors.floor?.message}>
              <Input
                {...fieldAria("floor", { error: errors.floor?.message })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("floor")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Dostęp do lokalu</h2>
          <p className="-mt-2 text-xs text-muted">
            To, co przekazujesz najemcy przy wydaniu kluczy — i czego potem szukasz w mailach sprzed
            roku.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="intercomCode"
              label="Kod do domofonu"
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
              id="checkoutTime"
              label="Godzina zdania lokalu"
              error={errors.checkoutTime?.message}
              hint="Do której najemca oddaje klucze ostatniego dnia."
            >
              <Input
                {...fieldAria("checkoutTime", {
                  error: errors.checkoutTime?.message,
                })}
                placeholder="11:00"
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("checkoutTime")}
              />
            </FormField>

            <FormField
              id="storageUnit"
              label="Komórka lokatorska"
              error={errors.storageUnit?.message}
              hint="Numer i gdzie jej szukać."
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
              label="Miejsce na rowery"
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

            <FormField id="wasteDisposal" label="Śmietnik" error={errors.wasteDisposal?.message}>
              <Input
                {...fieldAria("wasteDisposal", {
                  error: errors.wasteDisposal?.message,
                })}
                disabled={isSubmitting}
                {...register("wasteDisposal")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Administracja budynku</h2>
          <p className="-mt-2 text-xs text-muted">
            Wspólnota albo spółdzielnia — numer, pod który dzwonisz przy zalaniu i awarii pionu. To
            nie jest właściciel lokalu.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="buildingManagerName"
              label="Nazwa"
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
              label="Adres"
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
              label="Telefon"
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
              label="E-mail"
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Ogrzewanie i internet</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="heatingType"
              label="Rodzaj ogrzewania"
              error={errors.heatingType?.message}
            >
              <Select
                {...fieldAria("heatingType", {
                  error: errors.heatingType?.message,
                })}
                disabled={isSubmitting}
                {...register("heatingType")}
              >
                <option value="">Nie podano</option>
                {Object.entries(HEATING_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="internetSpeedMbps"
              label="Prędkość łącza (Mbit/s)"
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
              label="Dostawca internetu"
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
              label="Telefon do dostawcy"
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

            <FormField id="wifiSsid" label="Nazwa sieci Wi-Fi" error={errors.wifiSsid?.message}>
              <Input
                {...fieldAria("wifiSsid", { error: errors.wifiSsid?.message })}
                disabled={isSubmitting}
                {...register("wifiSsid")}
              />
            </FormField>

            <FormField
              id="wifiPassword"
              label="Hasło do Wi-Fi"
              error={errors.wifiPassword?.message}
              hint="Widzisz je tylko Ty — przepiszesz najemcy przy wydaniu kluczy."
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
              label="Koniec umowy na internet"
              error={errors.internetContractEndsAt?.message}
              hint="Żeby nie przedłużyła się sama."
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Przeglądy i dokumenty</h2>
          <p className="-mt-2 text-xs text-muted">
            Terminy, po których przekroczeniu robi się problem — karta wyróżni te, które minęły.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="landRegistryNumber"
              label="Numer księgi wieczystej"
              error={errors.landRegistryNumber?.message}
              hint="Wchodzi do umowy najmu okazjonalnego."
            >
              <Input
                {...fieldAria("landRegistryNumber", {
                  error: errors.landRegistryNumber?.message,
                })}
                disabled={isSubmitting}
                {...register("landRegistryNumber")}
              />
            </FormField>

            <FormField
              id="energyCertificateEp"
              label="Wskaźnik EP"
              error={errors.energyCertificateEp?.message}
              hint="Ze świadectwa energetycznego, w kWh/(m²·rok)."
            >
              <Input
                {...fieldAria("energyCertificateEp", {
                  error: errors.energyCertificateEp?.message,
                })}
                inputMode="decimal"
                disabled={isSubmitting}
                {...register("energyCertificateEp")}
              />
            </FormField>

            <FormField
              id="energyCertificateExpiresAt"
              label="Ważność świadectwa"
              error={errors.energyCertificateExpiresAt?.message}
            >
              <DateInput
                {...fieldAria("energyCertificateExpiresAt", {
                  error: errors.energyCertificateExpiresAt?.message,
                })}

                disabled={isSubmitting}
                {...register("energyCertificateExpiresAt")}
              />
            </FormField>

            <FormField id="boilerModel" label="Model pieca" error={errors.boilerModel?.message}>
              <Input
                {...fieldAria("boilerModel", {
                  error: errors.boilerModel?.message,
                })}
                disabled={isSubmitting}
                {...register("boilerModel")}
              />
            </FormField>

            <FormField
              id="boilerInspectionAt"
              label="Następny przegląd pieca"
              error={errors.boilerInspectionAt?.message}
            >
              <DateInput
                {...fieldAria("boilerInspectionAt", {
                  error: errors.boilerInspectionAt?.message,
                })}

                disabled={isSubmitting}
                {...register("boilerInspectionAt")}
              />
            </FormField>

            <FormField
              id="technicalInspectionAt"
              label="Następny przegląd techniczny"
              error={errors.technicalInspectionAt?.message}
            >
              <DateInput
                {...fieldAria("technicalInspectionAt", {
                  error: errors.technicalInspectionAt?.message,
                })}

                disabled={isSubmitting}
                {...register("technicalInspectionAt")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-[15px] font-semibold text-fg">Okolica i dojazd</h2>
          <p className="-mt-2 text-xs text-muted">
            Odpowiedzi na pytania, które padają przy każdym oglądaniu.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="gpsCoordinates"
              label="Współrzędne GPS"
              error={errors.gpsCoordinates?.message}
              hint="Wklej z map, np. 52.2297, 21.0122."
              className="sm:col-span-2"
            >
              <Input
                {...fieldAria("gpsCoordinates", {
                  error: errors.gpsCoordinates?.message,
                })}
                disabled={isSubmitting}
                {...register("gpsCoordinates")}
              />
            </FormField>

            <FormField
              id="transitLines"
              label="Linie komunikacji"
              error={errors.transitLines?.message}
              hint="Np. tramwaj 4 i 14, autobus 178."
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
              id="transitStopDistanceM"
              label="Odległość od przystanku (m)"
              error={errors.transitStopDistanceM?.message}
            >
              <Input
                {...fieldAria("transitStopDistanceM", {
                  error: errors.transitStopDistanceM?.message,
                })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("transitStopDistanceM")}
              />
            </FormField>

            <FormField
              id="universityDistanceM"
              label="Odległość od uczelni (m)"
              error={errors.universityDistanceM?.message}
            >
              <Input
                {...fieldAria("universityDistanceM", {
                  error: errors.universityDistanceM?.message,
                })}
                inputMode="numeric"
                disabled={isSubmitting}
                {...register("universityDistanceM")}
              />
            </FormField>

            <FormField
              id="nearbyPlaces"
              label="Ważne punkty w okolicy"
              error={errors.nearbyPlaces?.message}
              hint="Sklep, przychodnia, szkoła, park."
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
              {...fieldAria("description", {
                error: errors.description?.message,
              })}
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

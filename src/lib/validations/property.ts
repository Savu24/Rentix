import { z } from "zod";

import { HeatingType, PropertyType, RentalStatus } from "@/generated/prisma/enums";

import { fill } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";

import {
  type ValidationContext,
  optionalDateInput,
  optionalDecimalInput,
  optionalEmail,
  optionalInt,
  optionalMoneyInput,
  optionalPhone,
  optionalText,
  postalCodeSchema,
  requiredText,
} from "./common";

const propertyTypes = Object.values(PropertyType) as [PropertyType, ...PropertyType[]];
const rentalStatuses = Object.values(RentalStatus) as [RentalStatus, ...RentalStatus[]];
const heatingTypes = Object.values(HeatingType) as [HeatingType, ...HeatingType[]];

export function propertyTypeLabels(d: Pick<Dictionary, "panel">): Record<PropertyType, string> {
  return d.panel.properties.type;
}

export function rentalStatusLabels(d: Pick<Dictionary, "panel">): Record<RentalStatus, string> {
  return d.panel.properties.rentalStatus;
}

/**
 * Statusy, które właściciel ustawia sam.
 *
 * „Wynajęte" bierze się z umowy, a nie z listy wyboru: gdyby dało się je
 * kliknąć, mieszkanie byłoby zajęte bez najemcy — i odwrotnie, wybór „wolne"
 * przy trwającej umowie kłamałby na liście wolnych lokali.
 */
export const PROPERTY_SETTABLE_STATUSES = ["AVAILABLE", "UNAVAILABLE"] as const;

export const RENTAL_STATUS_TONE: Record<RentalStatus, "good" | "warning" | "neutral"> = {
  AVAILABLE: "warning",
  OCCUPIED: "good",
  UNAVAILABLE: "neutral",
};

export function heatingTypeLabels(d: Pick<Dictionary, "panel">): Record<HeatingType, string> {
  return d.panel.properties.heating;
}

/**
 * Godzina zdania lokalu — „HH:MM" po normalizacji.
 *
 * Przyjmujemy też „9:00" i „9.00", bo tak się to wpisuje, a zapisujemy
 * zawsze „09:00": ta godzina trafia do wiadomości dla najemcy i do umowy,
 * więc nie może raz wyglądać tak, a raz inaczej.
 */
const checkoutTimeSchema = (c: ValidationContext) =>
  z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const match = /^(\d{1,2})[:.](\d{2})$/.exec(value);
        if (!match) {
          ctx.addIssue({ code: "custom", message: c.d.panel.properties.checkoutTimeFormat });
          return z.NEVER;
        }

        const [, hour, minute] = match.map(Number) as [never, number, number];
        if (hour > 23 || minute > 59) {
          ctx.addIssue({ code: "custom", message: c.d.panel.properties.checkoutTimeInvalid });
          return z.NEVER;
        }

        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      }),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * Współrzędne GPS w jednym polu: „52.2297, 21.0122".
 *
 * Rozdzielamy po przecinku, średniku albo spacji i wymagamy dokładnie dwóch
 * liczb — dokładnie tego, co wychodzi z „kopiuj współrzędne" w mapach.
 * Kropka, nie przecinek dziesiętny: przy przecinku „52,2297, 21,0122" nie da
 * się odróżnić separatora liczb od separatora części dziesiętnej.
 */
const coordinatesSchema = (c: ValidationContext) =>
  z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const parts = value.split(/[,;\s]+/).filter(Boolean);
        const invalid = () => {
          ctx.addIssue({
            code: "custom",
            message: c.d.panel.properties.coordinatesFormat,
          });
          return z.NEVER;
        };

        if (parts.length !== 2) return invalid();
        if (!parts.every((part) => /^-?\d{1,3}(\.\d{1,8})?$/.test(part))) return invalid();

        const [lat, lng] = parts.map(Number) as [number, number];
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          ctx.addIssue({
            code: "custom",
            message: c.d.panel.properties.coordinatesRange,
          });
          return z.NEVER;
        }

        return `${lat}, ${lng}`;
      }),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/** Ile pokoi wolno utworzyć jednym ruchem — zabezpieczenie przed literówką. */
export const MAX_ROOMS_PER_PROPERTY = 30;

/**
 * Nieruchomość — jest jednocześnie przedmiotem najmu, więc nosi też dane,
 * które wcześniej siedziały na osobnej „jednostce": powierzchnię, piętro
 * i czynsz wywoławczy.
 */
export const propertyFormSchema = (c: ValidationContext) =>
  z.object({
  name: requiredText(c, c.d.panel.properties.fields.name, 120),
  type: z.enum(propertyTypes),

  /**
   * Brak pola = status zostaje bez zmian. Formularz pokazuje go tylko przy
   * nieruchomości, która nie jest wynajęta — tamten status pilnuje umowa.
   */
  status: z.enum(PROPERTY_SETTABLE_STATUSES).optional(),

  /** Puste = nieruchomość własna; ustawione = podnajem albo zarządzanie. */
  ownerId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),

  street: requiredText(c, c.d.panel.properties.fields.street, 120),
  buildingNumber: requiredText(c, c.d.panel.properties.fields.buildingNumber, 20),
  /** Puste przy domu i budynku w całości — tam numeru lokalu nie ma. */
  apartmentNumber: optionalText(c, 20),
  postalCode: postalCodeSchema(c),
  city: requiredText(c, c.d.panel.properties.fields.city, 80),
  district: optionalText(c, 80),

  areaM2: optionalDecimalInput(c, c.d.panel.properties.fields.area, { max: 10_000, scale: 2 }),
  floor: optionalInt(c, c.d.panel.properties.fields.floor, { min: -5, max: 200 }),
  askingRentGrosze: optionalMoneyInput(c, c.d.panel.properties.fields.askingRent),

  // Dostęp do lokalu — to, co przekazuje się przy wydaniu kluczy.
  intercomCode: optionalText(c, 40),
  checkoutTime: checkoutTimeSchema(c),
  storageUnit: optionalText(c, 200),
  bikeStorage: optionalText(c, 200),
  wasteDisposal: optionalText(c, 200),

  // Administracja budynku: wspólnota albo spółdzielnia, nie właściciel lokalu.
  buildingManagerName: optionalText(c, 160),
  buildingManagerAddress: optionalText(c, 200),
  buildingManagerPhone: optionalPhone(c),
  buildingManagerEmail: optionalEmail(c),

  // Media i internet.
  heatingType: z
    .union([z.literal(""), z.enum(heatingTypes)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  internetProvider: optionalText(c, 120),
  internetProviderPhone: optionalPhone(c),
  internetSpeedMbps: optionalInt(c, c.d.panel.properties.fields.internetSpeed, { min: 1, max: 100_000 }),
  wifiSsid: optionalText(c, 64),
  wifiPassword: optionalText(c, 120),
  internetContractEndsAt: optionalDateInput(c, c.d.panel.properties.fields.internetContractEnd),

  // Przeglądy i dokumenty.
  landRegistryNumber: optionalText(c, 60),
  energyCertificateEp: optionalDecimalInput(c, c.d.panel.properties.fields.energyIndex, { max: 9999, scale: 2 }),
  energyCertificateExpiresAt: optionalDateInput(c, c.d.panel.properties.fields.certificateValidUntil),
  boilerModel: optionalText(c, 120),
  boilerInspectionAt: optionalDateInput(c, c.d.panel.properties.fields.boilerInspection),
  technicalInspectionAt: optionalDateInput(c, c.d.panel.properties.fields.technicalInspection),

  // Okolica i dojazd. Odległości w metrach — 100 km to sufit z zapasem,
  // powyżej tego „w okolicy" przestaje cokolwiek znaczyć.
  gpsCoordinates: coordinatesSchema(c),
  transitLines: optionalText(c, 200),
  transitStopDistanceM: optionalInt(c, c.d.panel.properties.fields.transitDistance, { min: 0, max: 100_000 }),
  universityDistanceM: optionalInt(c, c.d.panel.properties.fields.universityDistance, { min: 0, max: 100_000 }),
  nearbyPlaces: optionalText(c, 1000),

  description: optionalText(c, 2000),
  notes: optionalText(c, 2000),
  publiclyListed: z.boolean().default(false),
});

export type PropertyFormInput = z.input<ReturnType<typeof propertyFormSchema>>;
export type PropertyFormOutput = z.output<ReturnType<typeof propertyFormSchema>>;

/**
 * Zakładanie nieruchomości: dane plus liczba pokoi.
 *
 * Pokoje powstają od razu, razem z nieruchomością — użytkownik podaje ich
 * liczbę i w kolejnym kroku wpisuje ceny. Dzięki temu nie ma stanu, w którym
 * nieruchomość istnieje, a pokoje trzeba dodawać po jednym.
 */
export const propertyCreateSchema = (c: ValidationContext) =>
  propertyFormSchema(c).extend({
  roomCount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return 0;

      const parsed = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        ctx.addIssue({ code: "custom", message: c.d.panel.properties.roomCountInteger });
        return z.NEVER;
      }
      if (parsed > MAX_ROOMS_PER_PROPERTY) {
        ctx.addIssue({
          code: "custom",
          message: fill(c.d.panel.properties.roomCountTooMany, { max: MAX_ROOMS_PER_PROPERTY }),
        });
        return z.NEVER;
      }
      return parsed;
    }),
});

export type PropertyCreateInput = z.input<ReturnType<typeof propertyCreateSchema>>;
export type PropertyCreateOutput = z.output<ReturnType<typeof propertyCreateSchema>>;

export const propertyUpdateSchema = (c: ValidationContext) => propertyFormSchema(c).partial();

/**
 * Pokój. Bez powierzchni — przy pokoju nikt jej nie rozlicza.
 */
export const roomFormSchema = (c: ValidationContext) =>
  z.object({
  name: requiredText(c, c.d.panel.properties.fields.roomName, 60),
  status: z.enum(rentalStatuses).default("AVAILABLE"),
  monthlyRentGrosze: optionalMoneyInput(c, c.d.panel.properties.fields.roomRent),
  notes: optionalText(c, 1000),
});

export type RoomFormInput = z.input<ReturnType<typeof roomFormSchema>>;
export type RoomFormOutput = z.output<ReturnType<typeof roomFormSchema>>;

export const roomUpdateSchema = (c: ValidationContext) => roomFormSchema(c).partial();

/**
 * Krok „wpisz ceny": zapis wszystkich pokoi nieruchomości naraz.
 * Jedno żądanie zamiast N — inaczej połowa cen mogłaby się zapisać,
 * a połowa nie.
 */
export const roomsBulkUpdateSchema = (c: ValidationContext) =>
  z.object({
  rooms: z
    .array(
      z.object({
        id: z.string().min(1),
        name: requiredText(c, c.d.panel.properties.fields.roomName, 60),
        monthlyRentGrosze: optionalMoneyInput(c, c.d.panel.properties.fields.roomRent),
      }),
    )
    .min(1, "Brak pokoi do zapisania")
    .max(MAX_ROOMS_PER_PROPERTY),
});

export type RoomsBulkUpdateInput = z.input<ReturnType<typeof roomsBulkUpdateSchema>>;

export const propertyListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.enum(propertyTypes).optional(),
  occupancy: z.enum(["all", "vacant", "occupied", "unavailable"]).default("all"),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type PropertyListQuery = z.output<typeof propertyListQuerySchema>;

/** Domyślne nazwy pokoi przy zakładaniu: „Pokój 1" / „Room 1"… */
export function defaultRoomName(index: number, d: Pick<Dictionary, "panel">): string {
  return fill(d.panel.properties.defaultRoomName, { number: index + 1 });
}

import { z } from "zod";

import { PropertyType, RentalStatus } from "@/generated/prisma/enums";

import {
  optionalDecimalInput,
  optionalInt,
  optionalMoneyInput,
  optionalText,
  postalCodeSchema,
  requiredText,
} from "./common";

const propertyTypes = Object.values(PropertyType) as [PropertyType, ...PropertyType[]];
const rentalStatuses = Object.values(RentalStatus) as [RentalStatus, ...RentalStatus[]];

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  APARTMENT: "Mieszkanie",
  HOUSE: "Dom",
  ROOM: "Pokój",
  COMMERCIAL: "Lokal użytkowy",
  PARKING: "Miejsce postojowe",
  STORAGE: "Komórka lokatorska",
  BUILDING: "Budynek",
};

export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  AVAILABLE: "Wolne",
  OCCUPIED: "Wynajęte",
  UNAVAILABLE: "Niedostępne",
};

export const RENTAL_STATUS_TONE: Record<RentalStatus, "good" | "warning" | "neutral"> = {
  AVAILABLE: "warning",
  OCCUPIED: "good",
  UNAVAILABLE: "neutral",
};

/** Ile pokoi wolno utworzyć jednym ruchem — zabezpieczenie przed literówką. */
export const MAX_ROOMS_PER_PROPERTY = 30;

/**
 * Nieruchomość — jest jednocześnie przedmiotem najmu, więc nosi też dane,
 * które wcześniej siedziały na osobnej „jednostce": powierzchnię, piętro
 * i czynsz wywoławczy.
 */
export const propertyFormSchema = z.object({
  name: requiredText("Nazwa", 120),
  type: z.enum(propertyTypes),

  /** Puste = nieruchomość własna; ustawione = podnajem albo zarządzanie. */
  ownerId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),

  street: requiredText("Ulica", 120),
  buildingNumber: requiredText("Numer budynku", 20),
  /** Puste przy domu i budynku w całości — tam numeru lokalu nie ma. */
  apartmentNumber: optionalText(20),
  postalCode: postalCodeSchema,
  city: requiredText("Miejscowość", 80),
  district: optionalText(80),

  areaM2: optionalDecimalInput("Powierzchnia", { max: 10_000, scale: 2 }),
  floor: optionalInt("Piętro", { min: -5, max: 200 }),
  askingRentGrosze: optionalMoneyInput("Czynsz za całość"),

  description: optionalText(2000),
  notes: optionalText(2000),
  publiclyListed: z.boolean().default(false),
});

export type PropertyFormInput = z.input<typeof propertyFormSchema>;
export type PropertyFormOutput = z.output<typeof propertyFormSchema>;

/**
 * Zakładanie nieruchomości: dane plus liczba pokoi.
 *
 * Pokoje powstają od razu, razem z nieruchomością — użytkownik podaje ich
 * liczbę i w kolejnym kroku wpisuje ceny. Dzięki temu nie ma stanu, w którym
 * nieruchomość istnieje, a pokoje trzeba dodawać po jednym.
 */
export const propertyCreateSchema = propertyFormSchema.extend({
  roomCount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return 0;

      const parsed = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        ctx.addIssue({ code: "custom", message: "Liczba pokoi musi być liczbą całkowitą" });
        return z.NEVER;
      }
      if (parsed > MAX_ROOMS_PER_PROPERTY) {
        ctx.addIssue({
          code: "custom",
          message: `Maksymalnie ${MAX_ROOMS_PER_PROPERTY} pokoi naraz`,
        });
        return z.NEVER;
      }
      return parsed;
    }),
});

export type PropertyCreateInput = z.input<typeof propertyCreateSchema>;
export type PropertyCreateOutput = z.output<typeof propertyCreateSchema>;

export const propertyUpdateSchema = propertyFormSchema.partial();

/**
 * Pokój. Bez powierzchni — przy pokoju nikt jej nie rozlicza.
 */
export const roomFormSchema = z.object({
  name: requiredText("Oznaczenie pokoju", 60),
  status: z.enum(rentalStatuses).default("AVAILABLE"),
  monthlyRentGrosze: optionalMoneyInput("Czynsz za pokój"),
  notes: optionalText(1000),
});

export type RoomFormInput = z.input<typeof roomFormSchema>;
export type RoomFormOutput = z.output<typeof roomFormSchema>;

export const roomUpdateSchema = roomFormSchema.partial();

/**
 * Krok „wpisz ceny": zapis wszystkich pokoi nieruchomości naraz.
 * Jedno żądanie zamiast N — inaczej połowa cen mogłaby się zapisać,
 * a połowa nie.
 */
export const roomsBulkUpdateSchema = z.object({
  rooms: z
    .array(
      z.object({
        id: z.string().min(1),
        name: requiredText("Oznaczenie pokoju", 60),
        monthlyRentGrosze: optionalMoneyInput("Czynsz za pokój"),
      }),
    )
    .min(1, "Brak pokoi do zapisania")
    .max(MAX_ROOMS_PER_PROPERTY),
});

export type RoomsBulkUpdateInput = z.input<typeof roomsBulkUpdateSchema>;

export const propertyListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z.enum(propertyTypes).optional(),
  occupancy: z.enum(["all", "vacant", "occupied"]).default("all"),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type PropertyListQuery = z.output<typeof propertyListQuerySchema>;

/** Domyślne nazwy pokoi przy zakładaniu: „Pokój 1", „Pokój 2"… */
export function defaultRoomName(index: number): string {
  return `Pokój ${index + 1}`;
}

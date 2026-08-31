import { z } from "zod";

import { HeatingType, PropertyType, RentalStatus } from "@/generated/prisma/enums";

import {
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

export const HEATING_TYPE_LABEL: Record<HeatingType, string> = {
  DISTRICT: "Miejskie",
  GAS: "Gazowe",
  ELECTRIC: "Elektryczne",
  HEAT_PUMP: "Pompa ciepła",
  SOLID_FUEL: "Paliwo stałe",
  OTHER: "Inne",
};

/**
 * Godzina zdania lokalu — „HH:MM" po normalizacji.
 *
 * Przyjmujemy też „9:00" i „9.00", bo tak się to wpisuje, a zapisujemy
 * zawsze „09:00": ta godzina trafia do wiadomości dla najemcy i do umowy,
 * więc nie może raz wyglądać tak, a raz inaczej.
 */
const checkoutTimeSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const match = /^(\d{1,2})[:.](\d{2})$/.exec(value);
        if (!match) {
          ctx.addIssue({ code: "custom", message: "Godzina w formacie GG:MM, np. 11:00" });
          return z.NEVER;
        }

        const [, hour, minute] = match.map(Number) as [never, number, number];
        if (hour > 23 || minute > 59) {
          ctx.addIssue({ code: "custom", message: "Taka godzina nie istnieje" });
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
const coordinatesSchema = z
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
            message: "Współrzędne w formacie 52.2297, 21.0122",
          });
          return z.NEVER;
        };

        if (parts.length !== 2) return invalid();
        if (!parts.every((part) => /^-?\d{1,3}(\.\d{1,8})?$/.test(part))) return invalid();

        const [lat, lng] = parts.map(Number) as [number, number];
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          ctx.addIssue({
            code: "custom",
            message: "Szerokość mieści się w ±90, długość w ±180",
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

  // Dostęp do lokalu — to, co przekazuje się przy wydaniu kluczy.
  intercomCode: optionalText(40),
  checkoutTime: checkoutTimeSchema,
  storageUnit: optionalText(200),
  bikeStorage: optionalText(200),
  wasteDisposal: optionalText(200),

  // Administracja budynku: wspólnota albo spółdzielnia, nie właściciel lokalu.
  buildingManagerName: optionalText(160),
  buildingManagerAddress: optionalText(200),
  buildingManagerPhone: optionalPhone,
  buildingManagerEmail: optionalEmail,

  // Media i internet.
  heatingType: z
    .union([z.literal(""), z.enum(heatingTypes)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  internetProvider: optionalText(120),
  internetProviderPhone: optionalPhone,
  internetSpeedMbps: optionalInt("Prędkość łącza", { min: 1, max: 100_000 }),
  wifiSsid: optionalText(64),
  wifiPassword: optionalText(120),
  internetContractEndsAt: optionalDateInput("Koniec umowy na internet"),

  // Przeglądy i dokumenty.
  landRegistryNumber: optionalText(60),
  energyCertificateEp: optionalDecimalInput("Wskaźnik EP", { max: 9999, scale: 2 }),
  energyCertificateExpiresAt: optionalDateInput("Ważność świadectwa"),
  boilerModel: optionalText(120),
  boilerInspectionAt: optionalDateInput("Przegląd pieca"),
  technicalInspectionAt: optionalDateInput("Przegląd techniczny"),

  // Okolica i dojazd. Odległości w metrach — 100 km to sufit z zapasem,
  // powyżej tego „w okolicy" przestaje cokolwiek znaczyć.
  gpsCoordinates: coordinatesSchema,
  transitLines: optionalText(200),
  transitStopDistanceM: optionalInt("Odległość od przystanku", { min: 0, max: 100_000 }),
  universityDistanceM: optionalInt("Odległość od uczelni", { min: 0, max: 100_000 }),
  nearbyPlaces: optionalText(1000),

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

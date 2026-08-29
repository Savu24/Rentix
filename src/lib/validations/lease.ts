import { z } from "zod";

import { LeaseStatus, UtilitiesMode } from "@/generated/prisma/enums";
import { MAX_BILLING_DAY } from "@/lib/leases/billing";

import {
  dateInput,
  moneyInput,
  optionalDateInput,
  optionalMoneyInput,
  optionalText,
} from "./common";

const leaseStatuses = Object.values(LeaseStatus) as [LeaseStatus, ...LeaseStatus[]];
const utilitiesModes = Object.values(UtilitiesMode) as [UtilitiesMode, ...UtilitiesMode[]];

export const LEASE_STATUS_LABEL: Record<LeaseStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywna",
  TERMINATED: "Wypowiedziana",
  EXPIRED: "Wygasła",
};

export const LEASE_STATUS_TONE: Record<LeaseStatus, "neutral" | "good" | "warning" | "critical"> = {
  DRAFT: "neutral",
  ACTIVE: "good",
  TERMINATED: "critical",
  EXPIRED: "warning",
};

export const UTILITIES_MODE_LABEL: Record<UtilitiesMode, string> = {
  INCLUDED: "Media w czynszu",
  FLAT_RATE: "Stała zaliczka",
  METERED: "Wg liczników",
  MIXED: "Zaliczka + rozliczenie",
};

export const UTILITIES_MODE_HINT: Record<UtilitiesMode, string> = {
  INCLUDED: "Faktura zawiera wyłącznie czynsz.",
  FLAT_RATE: "Do czynszu doliczana jest stała zaliczka na media.",
  METERED: "Pozycje za media powstają z odczytów liczników.",
  MIXED: "Zaliczka co miesiąc, rozliczenie po odczytach.",
};

/**
 * Tryby, których naliczanie nie potrafi jeszcze w pełni obsłużyć.
 *
 * Odczytów liczników nie da się dziś wpisać, więc rozliczenie w trybie METERED
 * zawiera sam czynsz — dokument wygląda poprawnie i **jest zaniżony**, co bez
 * ostrzeżenia przechodzi niezauważone. Zamiast ukrywać tryb przed użytkownikiem
 * (są umowy, które faktycznie tak działają), mówimy wprost, czego zabraknie.
 */
export const UTILITIES_MODE_INCOMPLETE: Partial<Record<UtilitiesMode, string>> = {
  METERED:
    "Odczytów liczników nie da się jeszcze wpisać w Rentiksie, więc rozliczenie obejmie sam czynsz. Pozycje za media dolicz na razie poza systemem.",
  MIXED:
    "Zaliczka na media będzie naliczana normalnie, ale rozliczenia po odczytach liczników Rentix jeszcze nie zrobi.",
};

export const leaseFormSchema = z
  .object({
    propertyId: z.string().min(1, "Wybierz nieruchomość"),
    /**
     * Pusty = najem całej nieruchomości. Ustawiony = najem samego pokoju.
     * `propertyId` wypełniamy w obu przypadkach, żeby droga do nieruchomości
     * była zawsze taka sama.
     */
    roomId: z
      .union([z.literal(""), z.string().min(1)])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    // Co najmniej jeden najemca; pierwszy z listy jest głównym — to on dostaje
    // faktury i przypomnienia.
    tenantIds: z
      .array(z.string().min(1))
      .min(1, "Wskaż przynajmniej jednego najemcę")
      .max(6, "Maksymalnie sześciu najemców na umowie"),

    number: optionalText(40),
    status: z.enum(leaseStatuses).default("DRAFT"),

    startDate: dateInput("Data rozpoczęcia"),
    endDate: optionalDateInput("Data zakończenia"),

    rentGrosze: moneyInput("Czynsz"),
    // Puste pole = brak kaucji, nie błąd walidacji.
    depositGrosze: optionalMoneyInput("Kaucja").transform((value) => value ?? 0),

    utilitiesMode: z.enum(utilitiesModes).default("FLAT_RATE"),
    utilitiesAdvanceGrosze: optionalMoneyInput("Zaliczka na media").transform(
      (value) => value ?? 0,
    ),

    billingDay: z.coerce
      .number()
      .int("Dzień naliczania musi być liczbą całkowitą")
      .min(1, "Dzień naliczania musi mieścić się w zakresie 1–28")
      .max(MAX_BILLING_DAY, "Dzień naliczania musi mieścić się w zakresie 1–28")
      .default(1),

    /**
     * Odcięcie miesięcy rozliczonych poza Rentiksem — puste = naliczaj od
     * początku umowy. Bez walidacji względem `startDate`: data wcześniejsza niż
     * początek najmu jest bezczynna, a nie błędna, i odrzucanie jej blokowałoby
     * przepisanie umowy, którą rozliczasz w Rentiksie od pierwszego dnia.
     */
    billingStartsAt: optionalDateInput("Nie naliczaj przed"),
    paymentTermDays: z.coerce
      .number()
      .int("Termin płatności musi być liczbą całkowitą")
      .min(0, "Termin płatności nie może być ujemny")
      .max(90, "Termin płatności nie może przekraczać 90 dni")
      .default(10),

    /**
     * Czy dokumenty z tej umowy wychodzą najemcy mailem.
     *
     * Domyślnie tak — to jest sens automatu i wyłączanie go co umowę byłoby
     * pracą, której nikt nie chce wykonywać. Wyłączenie zostawiamy dla umów,
     * gdzie najemca prosi o papier albo rozlicza się przez zarządcę budynku.
     */
    sendInvoicesByEmail: z.coerce.boolean().default(true),

    notes: optionalText(2000),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.utilitiesMode === "FLAT_RATE" || data.utilitiesMode === "MIXED"
        ? data.utilitiesAdvanceGrosze > 0
        : true,
    {
      message: "Przy zaliczce na media podaj jej kwotę",
      path: ["utilitiesAdvanceGrosze"],
    },
  )
  .refine((data) => new Set(data.tenantIds).size === data.tenantIds.length, {
    message: "Ten sam najemca został wskazany dwa razy",
    path: ["tenantIds"],
  });

export type LeaseFormInput = z.input<typeof leaseFormSchema>;
export type LeaseFormOutput = z.output<typeof leaseFormSchema>;

/**
 * Kwota, której puste pole znaczy zero, a nieobecność — „nie ruszaj".
 *
 * `.optional()` musi zostać na wierzchu: `optionalMoneyInput` ma je w środku,
 * więc pominięty klucz i tak przechodziłby przez transformację i wracał jako
 * zero. Przy PATCH-u, który wysyła jedno pole, wyzerowałoby to kaucję na
 * każdej umowie dotkniętej przełącznikiem wysyłki maili.
 */
const patchMoney = (label: string) =>
  z
    .union([z.literal(""), moneyInput(label)])
    .transform((value) => (value === "" ? 0 : value))
    .optional();

/**
 * Aktualizacja umowy.
 *
 * `.partial()` nie działa na schemacie z `.refine()`, więc pola powtarzamy.
 * Reguła spójności dat zostaje — po prostu sprawdzamy ją tylko wtedy, gdy
 * przyszły obie daty.
 */
export const leaseUpdateSchema = z
  .object({
    number: optionalText(40),
    status: z.enum(leaseStatuses).optional(),
    startDate: dateInput("Data rozpoczęcia").optional(),
    endDate: optionalDateInput("Data zakończenia").optional(),
    rentGrosze: moneyInput("Czynsz").optional(),
    depositGrosze: patchMoney("Kaucja"),
    utilitiesMode: z.enum(utilitiesModes).optional(),
    utilitiesAdvanceGrosze: patchMoney("Zaliczka na media"),
    billingDay: z.coerce.number().int().min(1).max(MAX_BILLING_DAY).optional(),
    // Puste pole czyści odcięcie — pomyłka przy zakładaniu umowy musi dawać się
    // cofnąć z panelu, inaczej zostałyby tylko szkice i ręczne grzebanie w bazie.
    billingStartsAt: optionalDateInput("Nie naliczaj przed").optional(),
    paymentTermDays: z.coerce.number().int().min(0).max(90).optional(),
    sendInvoicesByEmail: z.coerce.boolean().optional(),
    notes: optionalText(2000),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
      path: ["endDate"],
    },
  )
  .refine(
    (data) =>
      data.utilitiesMode === "FLAT_RATE" || data.utilitiesMode === "MIXED"
        ? // `undefined` = pole nie przyszło w tym żądaniu, więc zaliczka
          // zostaje ta, która jest w bazie — nie ma czego sprawdzać.
          data.utilitiesAdvanceGrosze === undefined || data.utilitiesAdvanceGrosze > 0
        : true,
    {
      message: "Przy zaliczce na media podaj jej kwotę",
      path: ["utilitiesAdvanceGrosze"],
    },
  );

/**
 * Edycja warunków zawartej umowy.
 *
 * Bez nieruchomości, pokoju, najemców i statusu: przepięcie umowy na inny lokal
 * albo na inną osobę to nie poprawka, tylko nowa umowa, a zmiana statusu ma
 * własne drogi — wypowiedzenie i przywrócenie z archiwum — które zwalniają
 * jednostkę i przestawiają najemcę. Formularz, który by je omijał, zostawiłby
 * lokal zajęty przez umowę, której już nie ma.
 */
export const leaseEditSchema = z
  .object({
    number: optionalText(40),
    startDate: dateInput("Data rozpoczęcia"),
    endDate: optionalDateInput("Data zakończenia"),
    rentGrosze: moneyInput("Czynsz"),
    depositGrosze: patchMoney("Kaucja"),
    utilitiesMode: z.enum(utilitiesModes),
    utilitiesAdvanceGrosze: patchMoney("Zaliczka na media"),
    billingDay: z.coerce
      .number()
      .int("Dzień naliczania musi być liczbą całkowitą")
      .min(1, "Dzień naliczania musi mieścić się w zakresie 1–28")
      .max(MAX_BILLING_DAY, "Dzień naliczania musi mieścić się w zakresie 1–28"),
    billingStartsAt: optionalDateInput("Nie naliczaj przed"),
    paymentTermDays: z.coerce
      .number()
      .int("Termin płatności musi być liczbą całkowitą")
      .min(0, "Termin płatności nie może być ujemny")
      .max(90, "Termin płatności nie może przekraczać 90 dni"),
    sendInvoicesByEmail: z.coerce.boolean(),
    notes: optionalText(2000),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.utilitiesMode === "FLAT_RATE" || data.utilitiesMode === "MIXED"
        ? (data.utilitiesAdvanceGrosze ?? 0) > 0
        : true,
    {
      message: "Przy zaliczce na media podaj jej kwotę",
      path: ["utilitiesAdvanceGrosze"],
    },
  );

export type LeaseEditInput = z.input<typeof leaseEditSchema>;
export type LeaseEditOutput = z.output<typeof leaseEditSchema>;

/** Przedłużenie umowy — jedyne, co się zmienia, to data zakończenia. */
export const leaseExtendSchema = z.object({
  endDate: dateInput("Nowa data zakończenia"),
});

export const leaseListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(leaseStatuses).optional(),
  propertyId: z.string().max(64).optional(),
  /** Umowy kończące się w ciągu N dni — do przypomnień o przedłużeniu. */
  expiringInDays: z.coerce.number().int().min(1).max(365).optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type LeaseListQuery = z.output<typeof leaseListQuerySchema>;

export const terminateLeaseSchema = z.object({
  terminatedAt: dateInput("Data zakończenia"),
  terminationNote: optionalText(1000),
});

import { z } from "zod";

import { LeaseStatus, UtilitiesMode } from "@/generated/prisma/enums";
import { MAX_BILLING_DAY } from "@/lib/leases/billing";

import type { Dictionary } from "@/lib/i18n/types";

import {
  type ValidationContext,
  dateInput,
  moneyInput,
  optionalDateInput,
  optionalMoneyInput,
  optionalText,
} from "./common";

const leaseStatuses = Object.values(LeaseStatus) as [LeaseStatus, ...LeaseStatus[]];
const utilitiesModes = Object.values(UtilitiesMode) as [UtilitiesMode, ...UtilitiesMode[]];

export function leaseStatusLabels(d: Pick<Dictionary, "panel">): Record<LeaseStatus, string> {
  return d.panel.leases.status;
}

export const LEASE_STATUS_TONE: Record<LeaseStatus, "neutral" | "good" | "warning" | "critical"> = {
  DRAFT: "neutral",
  RESERVED: "warning",
  ACTIVE: "good",
  TERMINATED: "critical",
  EXPIRED: "warning",
};

/**
 * Statusy, które właściciel ustawia sam — na formularzu i przy edycji umowy.
 *
 * „Wypowiedziana" i „Wygasła" biorą się ze zdarzeń, a nie z wyboru z listy:
 * wypowiedzenie ma własną akcję (zapisuje datę i zwalnia lokal), a wygaśnięcie
 * wynika z daty końca umowy. Wybranie ich z selecta zostawiłoby umowę
 * zakończoną tylko z nazwy, z lokalem dalej zajętym.
 */
export const LEASE_SETTABLE_STATUSES = ["DRAFT", "RESERVED", "ACTIVE"] as const;

export type LeaseSettableStatus = (typeof LEASE_SETTABLE_STATUSES)[number];

export function utilitiesModeLabels(d: Pick<Dictionary, "panel">): Record<UtilitiesMode, string> {
  return d.panel.leases.utilitiesMode;
}

export function utilitiesModeHints(d: Pick<Dictionary, "panel">): Record<UtilitiesMode, string> {
  return d.panel.leases.utilitiesHint;
}

/**
 * Tryby, których naliczanie nie potrafi jeszcze w pełni obsłużyć.
 *
 * Odczytów liczników nie da się dziś wpisać, więc rozliczenie w trybie METERED
 * zawiera sam czynsz — dokument wygląda poprawnie i **jest zaniżony**, co bez
 * ostrzeżenia przechodzi niezauważone. Zamiast ukrywać tryb przed użytkownikiem
 * (są umowy, które faktycznie tak działają), mówimy wprost, czego zabraknie.
 */
export function utilitiesModeIncomplete(d: Pick<Dictionary, "panel">): Partial<Record<UtilitiesMode, string>> {
  return d.panel.leases.utilitiesIncomplete;
}

export const leaseFormSchema = (c: ValidationContext) =>
  z
  .object({
    propertyId: z.string().min(1, c.d.panel.leases.propertyRequired),
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
      .min(1, c.d.panel.leases.tenantRequired)
      .max(6, c.d.panel.leases.tenantsTooMany),

    number: optionalText(c, 40),
    status: z.enum(LEASE_SETTABLE_STATUSES).default("DRAFT"),

    startDate: dateInput(c, c.d.panel.leases.fields.startDate),
    endDate: optionalDateInput(c, c.d.panel.leases.fields.endDate),

    rentGrosze: moneyInput(c, c.d.panel.leases.fields.rent),
    // Puste pole = brak kaucji, nie błąd walidacji.
    depositGrosze: optionalMoneyInput(c, c.d.panel.leases.fields.deposit).transform(
      (value) => value ?? 0,
    ),

    utilitiesMode: z.enum(utilitiesModes).default("FLAT_RATE"),
    utilitiesAdvanceGrosze: optionalMoneyInput(
      c,
      c.d.panel.leases.fields.utilitiesAdvance,
    ).transform((value) => value ?? 0),

    billingDay: z.coerce
      .number()
      .int(c.d.panel.leases.billingDayInteger)
      .min(1, c.d.panel.leases.billingDayRange)
      .max(MAX_BILLING_DAY, c.d.panel.leases.billingDayRange)
      .default(1),

    /**
     * Odcięcie miesięcy rozliczonych poza Rentiksem — puste = naliczaj od
     * początku umowy. Bez walidacji względem `startDate`: data wcześniejsza niż
     * początek najmu jest bezczynna, a nie błędna, i odrzucanie jej blokowałoby
     * przepisanie umowy, którą rozliczasz w Rentiksie od pierwszego dnia.
     */
    billingStartsAt: optionalDateInput(c, c.d.panel.leases.fields.billingStartsAt),
    paymentTermDays: z.coerce
      .number()
      .int(c.d.panel.leases.paymentTermInteger)
      .min(0, c.d.panel.leases.paymentTermNegative)
      .max(90, c.d.panel.leases.paymentTermTooLong)
      .default(10),

    /**
     * Czy dokumenty z tej umowy wychodzą najemcy mailem.
     *
     * Domyślnie tak — to jest sens automatu i wyłączanie go co umowę byłoby
     * pracą, której nikt nie chce wykonywać. Wyłączenie zostawiamy dla umów,
     * gdzie najemca prosi o papier albo rozlicza się przez zarządcę budynku.
     */
    sendInvoicesByEmail: z.coerce.boolean().default(true),

    notes: optionalText(c, 2000),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: c.d.panel.leases.endBeforeStart,
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.utilitiesMode === "FLAT_RATE" || data.utilitiesMode === "MIXED"
        ? data.utilitiesAdvanceGrosze > 0
        : true,
    {
      message: c.d.panel.leases.advanceRequired,
      path: ["utilitiesAdvanceGrosze"],
    },
  )
  .refine((data) => new Set(data.tenantIds).size === data.tenantIds.length, {
    message: c.d.panel.leases.tenantDuplicate,
    path: ["tenantIds"],
  });

export type LeaseFormInput = z.input<ReturnType<typeof leaseFormSchema>>;
export type LeaseFormOutput = z.output<ReturnType<typeof leaseFormSchema>>;

/**
 * Kwota, której puste pole znaczy zero, a nieobecność — „nie ruszaj".
 *
 * `.optional()` musi zostać na wierzchu: `optionalMoneyInput` ma je w środku,
 * więc pominięty klucz i tak przechodziłby przez transformację i wracał jako
 * zero. Przy PATCH-u, który wysyła jedno pole, wyzerowałoby to kaucję na
 * każdej umowie dotkniętej przełącznikiem wysyłki maili.
 */
const patchMoney = (c: ValidationContext, label: string) =>
  z
    .union([z.literal(""), moneyInput(c, label)])
    .transform((value) => (value === "" ? 0 : value))
    .optional();

/**
 * Aktualizacja umowy.
 *
 * `.partial()` nie działa na schemacie z `.refine()`, więc pola powtarzamy.
 * Reguła spójności dat zostaje — po prostu sprawdzamy ją tylko wtedy, gdy
 * przyszły obie daty.
 */
export const leaseUpdateSchema = (c: ValidationContext) =>
  z
  .object({
    number: optionalText(c, 40),
    status: z.enum(LEASE_SETTABLE_STATUSES).optional(),
    startDate: dateInput(c, c.d.panel.leases.fields.startDate).optional(),
    endDate: optionalDateInput(c, c.d.panel.leases.fields.endDate).optional(),
    rentGrosze: moneyInput(c, c.d.panel.leases.fields.rent).optional(),
    depositGrosze: patchMoney(c, c.d.panel.leases.fields.deposit),
    utilitiesMode: z.enum(utilitiesModes).optional(),
    utilitiesAdvanceGrosze: patchMoney(c, c.d.panel.leases.fields.utilitiesAdvance),
    billingDay: z.coerce.number().int().min(1).max(MAX_BILLING_DAY).optional(),
    // Puste pole czyści odcięcie — pomyłka przy zakładaniu umowy musi dawać się
    // cofnąć z panelu, inaczej zostałyby tylko szkice i ręczne grzebanie w bazie.
    billingStartsAt: optionalDateInput(c, c.d.panel.leases.fields.billingStartsAt).optional(),
    paymentTermDays: z.coerce.number().int().min(0).max(90).optional(),
    sendInvoicesByEmail: z.coerce.boolean().optional(),
    notes: optionalText(c, 2000),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: c.d.panel.leases.endBeforeStart,
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
      message: c.d.panel.leases.advanceRequired,
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
export const leaseEditSchema = (c: ValidationContext) =>
  z
  .object({
    number: optionalText(c, 40),
    /**
     * Brak pola = status zostaje bez zmian. Formularz pokazuje select tylko
     * dla umowy szkicowej, zarezerwowanej albo aktywnej: wypowiedzianej nie
     * wskrzesza się wyborem z listy, bo lokal jest już oddany.
     */
    status: z.enum(LEASE_SETTABLE_STATUSES).optional(),
    startDate: dateInput(c, c.d.panel.leases.fields.startDate),
    endDate: optionalDateInput(c, c.d.panel.leases.fields.endDate),
    rentGrosze: moneyInput(c, c.d.panel.leases.fields.rent),
    depositGrosze: patchMoney(c, c.d.panel.leases.fields.deposit),
    utilitiesMode: z.enum(utilitiesModes),
    utilitiesAdvanceGrosze: patchMoney(c, c.d.panel.leases.fields.utilitiesAdvance),
    billingDay: z.coerce
      .number()
      .int(c.d.panel.leases.billingDayInteger)
      .min(1, c.d.panel.leases.billingDayRange)
      .max(MAX_BILLING_DAY, c.d.panel.leases.billingDayRange),
    billingStartsAt: optionalDateInput(c, c.d.panel.leases.fields.billingStartsAt),
    paymentTermDays: z.coerce
      .number()
      .int(c.d.panel.leases.paymentTermInteger)
      .min(0, c.d.panel.leases.paymentTermNegative)
      .max(90, c.d.panel.leases.paymentTermTooLong),
    sendInvoicesByEmail: z.coerce.boolean(),
    notes: optionalText(c, 2000),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: c.d.panel.leases.endBeforeStart,
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.utilitiesMode === "FLAT_RATE" || data.utilitiesMode === "MIXED"
        ? (data.utilitiesAdvanceGrosze ?? 0) > 0
        : true,
    {
      message: c.d.panel.leases.advanceRequired,
      path: ["utilitiesAdvanceGrosze"],
    },
  );

export type LeaseEditInput = z.input<ReturnType<typeof leaseEditSchema>>;
export type LeaseEditOutput = z.output<ReturnType<typeof leaseEditSchema>>;

/** Przedłużenie umowy — jedyne, co się zmienia, to data zakończenia. */
export const leaseExtendSchema = (c: ValidationContext) =>
  z.object({
    endDate: dateInput(c, c.d.panel.leases.fields.newEndDate),
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

export const terminateLeaseSchema = (c: ValidationContext) =>
  z.object({
    terminatedAt: dateInput(c, c.d.panel.leases.fields.endDate),
    terminationNote: optionalText(c, 1000),
  });

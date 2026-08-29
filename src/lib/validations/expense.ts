import { z } from "zod";

import { ExpenseCategory, ExpenseRecurrence } from "@/generated/prisma/enums";

import {
  dateInput,
  idSchema,
  moneyInput,
  optionalInt,
  optionalText,
  requiredText,
} from "./common";

const expenseCategories = Object.values(ExpenseCategory) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  MORTGAGE: "Rata kredytu",
  RENT: "Wynajem",
  COMMUNITY_FEE: "Czynsz do wspólnoty",
  UTILITIES: "Media",
  REPAIR: "Naprawa i remont",
  FURNISHING: "Wyposażenie",
  INSURANCE: "Ubezpieczenie",
  PROPERTY_TAX: "Podatek od nieruchomości",
  INCOME_TAX: "Podatek od najmu",
  MANAGEMENT: "Zarządzanie i pośrednictwo",
  ACCOUNTING: "Księgowość",
  LEGAL: "Obsługa prawna",
  OTHER: "Inne",
};

/**
 * Kolejność na liście wyboru — od kosztów, które właściciel wpisuje najczęściej.
 * Alfabetycznie „Inne" wypadłoby w środku, a rata kredytu na końcu.
 */
export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "COMMUNITY_FEE",
  // Czynsz do właściciela przy podnajmie — pozycja comiesięczna i osobna dla
  // każdego lokalu, więc wpisywana częściej niż rata kredytu. Obie stoją obok
  // siebie, bo odpowiadają na to samo pytanie: ile kosztuje samo posiadanie
  // lokalu, zanim wejdzie do niego najemca.
  "RENT",
  "MORTGAGE",
  "UTILITIES",
  "REPAIR",
  "FURNISHING",
  "INSURANCE",
  "PROPERTY_TAX",
  "INCOME_TAX",
  "MANAGEMENT",
  "ACCOUNTING",
  "LEGAL",
  "OTHER",
];

const expenseRecurrences = Object.values(ExpenseRecurrence) as [
  ExpenseRecurrence,
  ...ExpenseRecurrence[],
];

/** Etykieta odpowiada na pytanie „co ile ponoszę ten koszt?". */
export const EXPENSE_RECURRENCE_LABEL: Record<ExpenseRecurrence, string> = {
  WEEKLY: "Co tydzień",
  MONTHLY: "Co miesiąc",
  YEARLY: "Co rok",
  CUSTOM: "Niestandardowo",
};

export const EXPENSE_RECURRENCE_ORDER: ExpenseRecurrence[] = [
  // Czynsz do wspólnoty i rata kredytu są miesięczne, więc miesiąc stoi
  // pierwszy — najczęstszy wybór ma być tym domyślnym.
  "MONTHLY",
  "WEEKLY",
  "YEARLY",
  "CUSTOM",
];

/** Górna granica odstępu: dłuższy niż dekada to już nie jest cykl. */
export const EXPENSE_RECURRENCE_MAX_DAYS = 3650;

/** Krótki opis cyklu do listy kosztów: „co 90 dni", „co miesiąc". */
export function describeRecurrence(
  recurrence: ExpenseRecurrence,
  everyDays: number | null,
): string {
  if (recurrence !== "CUSTOM") return EXPENSE_RECURRENCE_LABEL[recurrence].toLowerCase();
  return everyDays ? `co ${everyDays} dni` : "niestandardowo";
}

const expenseBaseSchema = z.object({
  /** Puste = koszt ogólny konta, nieprzypisany do nieruchomości. */
  propertyId: z
    .union([z.literal(""), idSchema])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),

  category: z.enum(expenseCategories).default("OTHER"),
  amountGrosze: moneyInput("Kwota").refine((value) => value > 0, {
    message: "Kwota musi być większa od zera",
  }),
  /** Kasowo — liczy się dzień, w którym pieniądze wyszły z konta. */
  paidAt: dateInput("Data poniesienia"),

  description: requiredText("Opis", 200),
  vendor: optionalText(120),
  documentRef: optionalText(80),
  notes: optionalText(2000),

  /**
   * Checkbox „koszt cykliczny". Trzymany osobno od `recurrence`, bo pole
   * wyboru cyklu zostaje wypełnione także po odznaczeniu checkboxa — i bez
   * tego rozróżnienia odznaczenie nie miałoby jak wyłączyć naliczania.
   *
   * Do bazy nie trafia: transformacja niżej zamienia je na `recurrence: null`.
   *
   * `default(false)` dotyczy tylko zapisu nowego kosztu — `.partial()` przy
   * edycji zdejmuje domyślną wartość, więc PATCH bez tego pola zostawia cykl
   * w spokoju, zamiast go po cichu kasować.
   */
  recurring: z.coerce.boolean().default(false),
  recurrence: z.enum(expenseRecurrences).nullable().optional(),
  /** Odstęp w dniach — pytany tylko przy cyklu „niestandardowo". */
  recurrenceEveryDays: optionalInt("Odstęp", { min: 1, max: EXPENSE_RECURRENCE_MAX_DAYS }),
});

type RecurrenceFields = {
  recurring?: boolean;
  recurrence?: ExpenseRecurrence | null;
  recurrenceEveryDays?: number | null;
};

/**
 * Cykl niestandardowy bez liczby dni nie ma znaczenia — naliczanie nie
 * wiedziałoby, co ile ma wracać. Sprawdzamy na całym obiekcie, bo warunek
 * wiąże dwa pola.
 */
function checkRecurrence(value: RecurrenceFields, ctx: z.RefinementCtx) {
  if (!value.recurring) return;

  if (value.recurrence === "CUSTOM" && !value.recurrenceEveryDays) {
    ctx.addIssue({
      code: "custom",
      path: ["recurrenceEveryDays"],
      message: "Podaj, co ile dni wraca ten koszt",
    });
  }
}

/**
 * Pola formularza → kolumny. Odznaczony checkbox kasuje cykl, a odstęp w dniach
 * zostaje wyłącznie przy „niestandardowo" — inaczej w bazie leżałaby liczba
 * dni obok cyklu miesięcznego, który jej nie używa.
 */
function toRecurrenceColumns<T extends RecurrenceFields>(value: T) {
  const { recurring, ...rest } = value;

  // PATCH bez pola cykliczności niczego w niej nie zmienia.
  if (recurring === undefined) return rest;

  if (!recurring) return { ...rest, recurrence: null, recurrenceEveryDays: null };

  const recurrence = rest.recurrence ?? "MONTHLY";
  return {
    ...rest,
    recurrence,
    recurrenceEveryDays: recurrence === "CUSTOM" ? (rest.recurrenceEveryDays ?? null) : null,
  };
}

export const expenseFormSchema = expenseBaseSchema
  .superRefine(checkRecurrence)
  .transform(toRecurrenceColumns);

export type ExpenseFormInput = z.input<typeof expenseBaseSchema>;
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

export const expenseUpdateSchema = expenseBaseSchema
  .partial()
  .superRefine(checkRecurrence)
  .transform(toRecurrenceColumns);
export type ExpenseUpdateOutput = z.output<typeof expenseUpdateSchema>;

export const expenseListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(expenseCategories).optional(),
  propertyId: z.string().max(64).optional(),
  /** Rok poniesienia — domyślny widok to bieżący rok obrotowy. */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type ExpenseListQuery = z.output<typeof expenseListQuerySchema>;

import { z } from "zod";

import { ExpenseCategory } from "@/generated/prisma/enums";

import { dateInput, idSchema, moneyInput, optionalText, requiredText } from "./common";

const expenseCategories = Object.values(ExpenseCategory) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  MORTGAGE: "Rata kredytu",
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

export const expenseFormSchema = z.object({
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
});

export type ExpenseFormInput = z.input<typeof expenseFormSchema>;
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

export const expenseUpdateSchema = expenseFormSchema.partial();
export type ExpenseUpdateOutput = z.output<typeof expenseUpdateSchema>;

export const expenseListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(expenseCategories).optional(),
  propertyId: z.string().max(64).optional(),
  /** Rok poniesienia — domyślny widok to bieżący rok obrotowy. */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type ExpenseListQuery = z.output<typeof expenseListQuerySchema>;

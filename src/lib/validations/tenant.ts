import { z } from "zod";

import { TenantStatus } from "@/generated/prisma/enums";

import { emailSchema } from "./auth";
import { optionalPostalCode, optionalTaxId, optionalText, requiredText } from "./common";

const tenantStatuses = Object.values(TenantStatus) as [TenantStatus, ...TenantStatus[]];

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  PROSPECT: "Zainteresowany",
  ACTIVE: "Aktywny",
  FORMER: "Były najemca",
};

export const TENANT_STATUS_TONE: Record<TenantStatus, "neutral" | "good" | "warning"> = {
  PROSPECT: "warning",
  ACTIVE: "good",
  FORMER: "neutral",
};

/**
 * Telefon: cyfry, spacje, +, myślniki i nawiasy. Formatu nie narzucamy.
 *
 * Puste pole musi być osobnym wariantem unii — regex wymaga min. 6 znaków,
 * więc „" odpadałoby zanim transformacja zdążyłaby zamienić je na null.
 */
const phoneSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[+()\d\s-]{6,24}$/, "Numer telefonu wygląda nieprawidłowo"),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const tenantFormSchema = z.object({
  firstName: requiredText("Imię", 60),
  lastName: requiredText("Nazwisko", 80),
  status: z.enum(tenantStatuses).default("PROSPECT"),

  // E-mail jest opcjonalny: właściciel może prowadzić najemcę, który nie ma
  // adresu — ale bez niego nie wyślemy przypomnień o płatności.
  email: z
    .union([z.literal(""), emailSchema])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  phone: phoneSchema,

  // Adres korespondencyjny trafia na fakturę jako dane nabywcy.
  street: optionalText(120),
  postalCode: optionalPostalCode,
  city: optionalText(80),
  /// NIP, gdy najemcą jest firma.
  taxId: optionalTaxId,

  notes: optionalText(2000),
});

export type TenantFormInput = z.input<typeof tenantFormSchema>;
export type TenantFormOutput = z.output<typeof tenantFormSchema>;

export const tenantUpdateSchema = tenantFormSchema.partial();

export const tenantListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(tenantStatuses).optional(),
  /** Tylko najemcy z zaległościami — najczęstszy filtr właściciela. */
  overdue: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type TenantListQuery = z.output<typeof tenantListQuerySchema>;

/** Pełne imię i nazwisko — jedno miejsce, żeby kolejność nie różniła się między widokami. */
export function tenantFullName(tenant: { firstName: string; lastName: string }): string {
  return `${tenant.firstName} ${tenant.lastName}`;
}

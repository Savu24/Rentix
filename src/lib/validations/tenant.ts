import { z } from "zod";

import { InvoiceKind, TenantStatus } from "@/generated/prisma/enums";

import { emailSchema } from "./auth";
import { optionalPostalCode, optionalTaxId, optionalText, requiredText } from "./common";

const tenantStatuses = Object.values(TenantStatus) as [TenantStatus, ...TenantStatus[]];
const documentKinds = Object.values(InvoiceKind) as [InvoiceKind, ...InvoiceKind[]];

/**
 * Co wystawiamy temu najemcy przy naliczaniu czynszu.
 *
 * Proformy nie ma na liście: to dokument doraźny, wystawiany ręcznie przed
 * zapłatą, a nie stałe ustawienie kartoteki.
 */
export const TENANT_DOCUMENT_KIND_OPTIONS = ["BILL", "VAT_INVOICE", "CHARGE"] as const;

export const TENANT_DOCUMENT_KIND_HINT: Partial<Record<InvoiceKind, string>> = {
  BILL: "Rachunek, a gdy pojawi się pozycja z VAT-em — faktura. Domyślne i pasuje większości najmu mieszkaniowego.",
  VAT_INVOICE: "Zawsze faktura VAT, także przy stawce zwolnionej. Dla najemcy-firmy, który tego wymaga.",
  CHARGE: "Samo naliczenie — informacja o kwocie do zapłaty. NIE jest dowodem księgowym i ma osobną numerację.",
};

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

/**
 * Numer dowodu osobistego: trzy litery i sześć cyfr (ABC123456).
 *
 * Spacje i wielkość liter normalizujemy sami — z dokumentu przepisuje się
 * „ABC 123456", a w bazie ma leżeć jeden zapis, żeby wyszukiwanie po numerze
 * nie zależało od tego, jak ktoś go wpisał. Cyfry kontrolnej nie liczymy,
 * z tego samego powodu co przy NIP-ie.
 */
const idCardSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
      .pipe(
        z
          .string()
          .regex(/^[A-Z]{3}\d{6}$/, "Numer dowodu to trzy litery i sześć cyfr, np. ABC123456"),
      ),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/** PESEL: jedenaście cyfr. Sumy kontrolnej nie liczymy — jak przy NIP-ie. */
const peselSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\d{11}$/, "PESEL składa się z 11 cyfr")),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/**
 * Numer paszportu: litery i cyfry, 5–15 znaków.
 *
 * Formatu nie narzucamy — paszport bywa zagraniczny, a każde państwo numeruje
 * po swojemu. Sprawdzamy tylko, że to nie jest zdanie wpisane w złe pole,
 * dlatego spacji w środku (inaczej niż przy dowodzie) nie wycinamy: gdyby
 * wycinać, „brak paszportu" przechodziłoby jako poprawny numer.
 */
const passportSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9]{5,15}$/, "Numer paszportu wygląda nieprawidłowo")),
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
  /// Jaki dokument dostaje ten najemca przy naliczaniu czynszu.
  documentKind: z.enum(documentKinds).default("BILL"),

  // Dokumenty tożsamości — każdy z osobna opcjonalny. Żadnego „przynajmniej
  // jeden": właściciel dopisuje je wtedy, gdy najemca faktycznie coś okazał,
  // a kartotekę zakłada się często wcześniej, po samym telefonie.
  idCardNumber: idCardSchema,
  pesel: peselSchema,
  passportNumber: passportSchema,

  // Osoba do kontaktu w nagłym wypadku — imię, nazwisko i telefon.
  emergencyContactFirstName: optionalText(60),
  emergencyContactLastName: optionalText(80),
  emergencyContactPhone: phoneSchema,

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

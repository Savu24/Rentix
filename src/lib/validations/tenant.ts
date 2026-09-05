import { z } from "zod";

import { InvoiceKind, TenantLegalForm, TenantStatus } from "@/generated/prisma/enums";

import type { Dictionary } from "@/lib/i18n/types";

import {
  type ValidationContext,
  optionalBankAccount,
  optionalDateInput,
  optionalEmail,
  optionalPhone,
  optionalPostalCode,
  optionalTaxId,
  optionalText,
  requiredText,
} from "./common";

const tenantStatuses = Object.values(TenantStatus) as [TenantStatus, ...TenantStatus[]];
const legalForms = Object.values(TenantLegalForm) as [TenantLegalForm, ...TenantLegalForm[]];
const documentKinds = Object.values(InvoiceKind) as [InvoiceKind, ...InvoiceKind[]];

export function tenantDocumentKindHints(d: Dictionary): Partial<Record<InvoiceKind, string>> {
  return d.panel.tenants.documentKindHint;
}

export function tenantStatusLabels(d: Dictionary): Record<TenantStatus, string> {
  return d.panel.tenants.status;
}

export const TENANT_STATUS_TONE: Record<TenantStatus, "neutral" | "good" | "warning"> = {
  PROSPECT: "warning",
  ACTIVE: "good",
  FORMER: "neutral",
};

export function tenantLegalFormLabels(d: Dictionary): Record<TenantLegalForm, string> {
  return d.panel.tenants.legalForm;
}

/**
 * Dokument tożsamości ze zdjęciem.
 *
 * Polska: dowód osobisty, trzy litery i sześć cyfr (ABC123456).
 * Wielka Brytania: dowodów osobistych tam nie ma, więc tę rolę pełni prawo
 * jazdy. Jego numer ma zmienną budowę, więc sprawdzamy tylko, że to numer,
 * a nie zdanie wpisane w złe pole.
 *
 * Spacje i wielkość liter normalizujemy sami — z dokumentu przepisuje się
 * „ABC 123456", a w bazie ma leżeć jeden zapis, żeby wyszukiwanie po numerze
 * nie zależało od tego, jak ktoś go wpisał. Cyfry kontrolnej nie liczymy,
 * z tego samego powodu co przy NIP-ie.
 */
const ID_CARD_PATTERN = {
  pl: /^[A-Z]{3}\d{6}$/,
  uk: /^[A-Z0-9]{5,20}$/,
} as const;

const idCardSchema = (c: ValidationContext) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
        .pipe(z.string().regex(ID_CARD_PATTERN[c.locale], c.d.panel.tenants.identity.idCard)),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

/**
 * Krajowy numer identyfikacyjny osoby.
 *
 * Polska: PESEL, jedenaście cyfr. Wielka Brytania: National Insurance number,
 * dwie litery, sześć cyfr i litera od A do D. To ta sama kolumna, bo pełni tę
 * samą rolę — identyfikuje najemcę w dokumentach — ale to dwa różne numery
 * i sprawdzanie ich jednym wzorcem przepuszczałoby jeden albo blokowało drugi.
 *
 * Sumy kontrolnej nie liczymy — jak przy NIP-ie.
 */
const NATIONAL_ID_PATTERN = {
  pl: /^\d{11}$/,
  uk: /^[A-Z]{2}\d{6}[A-D]$/,
} as const;

const peselSchema = (c: ValidationContext) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
        .pipe(
          z.string().regex(NATIONAL_ID_PATTERN[c.locale], c.d.panel.tenants.identity.nationalId),
        ),
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
const passportSchema = (c: ValidationContext) =>
  z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9]{5,15}$/, c.d.panel.tenants.identity.passport)),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const tenantFormSchema = (c: ValidationContext) =>
  z.object({
  firstName: requiredText(c, c.d.panel.tenants.fields.firstName, 60),
  lastName: requiredText(c, c.d.panel.tenants.fields.lastName, 80),
  status: z.enum(tenantStatuses).default("PROSPECT"),

  // E-mail jest opcjonalny: właściciel może prowadzić najemcę, który nie ma
  // adresu — ale bez niego nie wyślemy przypomnień o płatności.
  email: optionalEmail(c),
  phone: optionalPhone(c),

  /// Osoba fizyczna czy firma — patrz komentarz przy modelu `Tenant`.
  legalForm: z.enum(legalForms).default("INDIVIDUAL"),
  dateOfBirth: optionalDateInput(c, c.d.panel.tenants.fields.dateOfBirth),

  // Adres korespondencyjny trafia na fakturę jako dane nabywcy.
  street: optionalText(c, 120),
  postalCode: optionalPostalCode(c),
  city: optionalText(c, 80),
  /// NIP, gdy najemcą jest firma.
  taxId: optionalTaxId(c),
  /// Jaki dokument dostaje ten najemca przy naliczaniu czynszu.
  documentKind: z.enum(documentKinds).default("BILL"),

  // Dokumenty tożsamości — każdy z osobna opcjonalny. Żadnego „przynajmniej
  // jeden": właściciel dopisuje je wtedy, gdy najemca faktycznie coś okazał,
  // a kartotekę zakłada się często wcześniej, po samym telefonie.
  idCardNumber: idCardSchema(c),
  pesel: peselSchema(c),
  passportNumber: passportSchema(c),
  // Karta pobytu: zwykły tekst. Numery bywają różne — z wojewody, z decyzji,
  // przepisane z dokumentu obcego państwa — więc nie narzucamy formatu.
  residenceCardNumber: optionalText(c, 60),

  // Osoba do kontaktu w nagłym wypadku — imię, nazwisko, telefon i e-mail.
  // E-mail obok telefonu, bo gdy nikt nie odbiera, do wiadomości można wrócić.
  emergencyContactFirstName: optionalText(c, 60),
  emergencyContactLastName: optionalText(c, 80),
  emergencyContactPhone: optionalPhone(c),
  emergencyContactEmail: optionalEmail(c),

  // Adres zameldowania — inny byt niż korespondencyjny wyżej. Ten wchodzi do
  // umowy najmu okazjonalnego, tamten na fakturę, i mylenie ich kosztowałoby
  // ważność umowy. Data pusta = zameldowanie bezterminowe.
  registeredStreet: optionalText(c, 120),
  registeredPostalCode: optionalPostalCode(c),
  registeredCity: optionalText(c, 80),
  registeredUntil: optionalDateInput(c, c.d.panel.tenants.fields.registeredUntil),

  // Kontakt do spraw płatności, gdy inny niż podstawowy — czynsz płaci czasem
  // rodzic studenta albo księgowość firmy najemcy.
  billingEmail: optionalEmail(c),
  billingPhone: optionalPhone(c),
  // Rachunek do zwrotu kaucji — ta sama reguła co przy rachunku wystawcy.
  depositRefundAccount: optionalBankAccount(c),

  // Praca albo studia: z czego najemca zapłaci i do kiedy to trwa.
  employerName: optionalText(c, 120),
  employmentUntil: optionalDateInput(c, c.d.panel.tenants.fields.employmentUntil),

  // Polisa OC najemcy — numeru nie sprawdzamy wzorem, każdy ubezpieczyciel
  // numeruje po swojemu.
  insurerName: optionalText(c, 120),
  insurancePolicyNumber: optionalText(c, 60),
  insuranceExpiresAt: optionalDateInput(c, c.d.panel.tenants.fields.insuranceExpiresAt),

  notes: optionalText(c, 2000),
  });

export type TenantFormInput = z.input<ReturnType<typeof tenantFormSchema>>;
export type TenantFormOutput = z.output<ReturnType<typeof tenantFormSchema>>;

export const tenantUpdateSchema = (c: ValidationContext) => tenantFormSchema(c).partial();

/**
 * Porządki listy najemców.
 *
 * Nazwisko jest domyślne, bo tak się szuka konkretnej osoby. Reszta odpowiada
 * na pytania zadawane całej liście naraz: kto gdzie mieszka (adres), kto zalega
 * (saldo) i na jakim etapie jest jego umowa.
 */
export function tenantSortLabels(d: Dictionary) {
  return d.panel.tenants.sort;
}

export const TENANT_SORT_OPTIONS = ["name", "address", "debt", "leaseStatus"] as const;

export type TenantSort = (typeof TENANT_SORT_OPTIONS)[number];

export const tenantListQuerySchema = z.object({
  sort: z.enum(TENANT_SORT_OPTIONS).default("name"),
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

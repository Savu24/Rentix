import { z } from "zod";

import { emailSchema } from "./auth";
import { optionalPostalCode, optionalTaxId, optionalText, requiredText } from "./common";

/**
 * Właściciel lokalu przy podnajmie i zarządzaniu.
 *
 * Wymagana jest tylko nazwa. Reszta bywa nieznana przy pierwszym wpisie —
 * numer rachunku i NIP dostaje się zwykle dopiero przy pierwszym rozliczeniu,
 * a formularz, którego nie da się zapisać bez nich, kończy się notatką
 * w telefonie zamiast wpisem w systemie.
 */

/**
 * Polski numer rachunku: 26 cyfr, z opcjonalnym prefiksem PL.
 *
 * Spacje usuwamy przed sprawdzeniem — ludzie przepisują numer z umowy
 * w grupach po cztery i tak też go wklejają.
 *
 * Sumy kontrolnej IBAN nie liczymy: przelew i tak wykonuje człowiek w banku,
 * który sprawdzi ją porządnie, a fałszywy alarm na poprawnym numerze
 * zablokowałby zapis właściciela.
 */
export const optionalBankAccount = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .transform((value) => value.replace(/\s/g, "").replace(/^PL/i, ""))
      .pipe(z.string().regex(/^\d{26}$/, "Numer rachunku to 26 cyfr")),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export const ownerFormSchema = z.object({
  name: requiredText("Nazwa właściciela", 160),
  taxId: optionalTaxId,

  email: z
    .union([z.literal(""), emailSchema])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[+()\d\s-]{6,24}$/, "Numer telefonu wygląda nieprawidłowo"),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),

  street: optionalText(120),
  postalCode: optionalPostalCode,
  city: optionalText(80),

  bankAccount: optionalBankAccount,
  notes: optionalText(2000),
});

export type OwnerFormInput = z.input<typeof ownerFormSchema>;
export type OwnerFormOutput = z.output<typeof ownerFormSchema>;

export const ownerUpdateSchema = ownerFormSchema.partial();
export type OwnerUpdateOutput = z.output<typeof ownerUpdateSchema>;

export const ownerListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type OwnerListQuery = z.output<typeof ownerListQuerySchema>;

/** 26 cyfr → „12 3456 7890 1234 5678 9012 3456", jak na przelewie. */
export function formatBankAccount(account: string): string {
  const digits = account.replace(/\s/g, "");
  if (digits.length !== 26) return account;
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`.trim();
}

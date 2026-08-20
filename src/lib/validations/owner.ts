import { z } from "zod";

import { emailSchema } from "./auth";
import {
  optionalDateInput,
  optionalPostalCode,
  optionalTaxId,
  optionalText,
  requiredText,
} from "./common";

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

/**
 * Pola właściciela jako sam kształt, nie gotowy schemat.
 *
 * Sprawdzenie kolejności dat robi z niego `ZodEffects`, a na tym `.partial()`
 * (potrzebne dla PATCH-a) już nie zadziała — dlatego kształt stoi osobno
 * i oba schematy budują się z niego niezależnie.
 */
const ownerFields = {
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

  /**
   * Okres umowy o zarządzanie — od kiedy do kiedy obsługujesz ten lokal.
   *
   * Obie daty opcjonalne: właściciela wpisuje się często jeszcze przed
   * podpisaniem umowy, a puste pole końca znaczy czas nieokreślony.
   */
  contractStartDate: optionalDateInput("Data rozpoczęcia umowy"),
  contractEndDate: optionalDateInput("Data zakończenia umowy"),

  notes: optionalText(2000),
};

/**
 * Umowa nie może kończyć się przed rozpoczęciem. Przy PATCH-u obie daty bywają
 * pominięte i wtedy nie ma czego porównywać — sprawdzenie przepuszcza taki
 * przypadek zamiast wymuszać przysyłanie obu pól przy zmianie samego telefonu.
 */
const contractPeriodOrdered = (data: {
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
}) => !data.contractStartDate || !data.contractEndDate || data.contractEndDate >= data.contractStartDate;

const contractPeriodIssue = {
  message: "Data zakończenia nie może być wcześniejsza niż rozpoczęcia",
  path: ["contractEndDate"],
};

export const ownerFormSchema = z.object(ownerFields).refine(contractPeriodOrdered, contractPeriodIssue);

export type OwnerFormInput = z.input<typeof ownerFormSchema>;
export type OwnerFormOutput = z.output<typeof ownerFormSchema>;

export const ownerUpdateSchema = z
  .object(ownerFields)
  .partial()
  .refine(contractPeriodOrdered, contractPeriodIssue);
export type OwnerUpdateOutput = z.output<typeof ownerUpdateSchema>;

export const ownerListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type OwnerListQuery = z.output<typeof ownerListQuerySchema>;

/**
 * Okres umowy jednym zdaniem: „1 wrz 2026 – 31 sie 2027".
 *
 * Daty leżą w bazie jako północ UTC, więc i formatujemy je w UTC — inaczej
 * serwer w innej strefie pokazywałby dzień wcześniej niż wpisano.
 * `null` dla umowy bez dat: wtedy wiersz w ogóle się nie pokazuje.
 */
const contractDateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatContractPeriod(
  start: Date | null,
  end: Date | null,
): string | null {
  if (start && end) return `${contractDateFormat.format(start)} – ${contractDateFormat.format(end)}`;
  if (start) return `od ${contractDateFormat.format(start)}, czas nieokreślony`;
  if (end) return `do ${contractDateFormat.format(end)}`;
  return null;
}

/** 26 cyfr → „12 3456 7890 1234 5678 9012 3456", jak na przelewie. */
export function formatBankAccount(account: string): string {
  const digits = account.replace(/\s/g, "");
  if (digits.length !== 26) return account;
  return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`.trim();
}

import { z } from "zod";

import { fill } from "@/lib/i18n/format";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";

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

/**
 * Właściciel lokalu przy podnajmie i zarządzaniu.
 *
 * Wymagana jest tylko nazwa. Reszta bywa nieznana przy pierwszym wpisie —
 * numer rachunku i NIP dostaje się zwykle dopiero przy pierwszym rozliczeniu,
 * a formularz, którego nie da się zapisać bez nich, kończy się notatką
 * w telefonie zamiast wpisem w systemie.
 */

/**
 * Pola właściciela jako sam kształt, nie gotowy schemat.
 *
 * Sprawdzenie kolejności dat robi z niego `ZodEffects`, a na tym `.partial()`
 * (potrzebne dla PATCH-a) już nie zadziała — dlatego kształt stoi osobno
 * i oba schematy budują się z niego niezależnie.
 */
const ownerFields = (c: ValidationContext) => ({
  name: requiredText(c, c.d.panel.owners.fields.name, 160),
  taxId: optionalTaxId(c),

  email: optionalEmail(c),
  phone: optionalPhone(c),

  street: optionalText(c, 120),
  postalCode: optionalPostalCode(c),
  city: optionalText(c, 80),

  bankAccount: optionalBankAccount(c),

  /**
   * Okres umowy o zarządzanie — od kiedy do kiedy obsługujesz ten lokal.
   *
   * Obie daty opcjonalne: właściciela wpisuje się często jeszcze przed
   * podpisaniem umowy, a puste pole końca znaczy czas nieokreślony.
   */
  contractStartDate: optionalDateInput(c, c.d.panel.owners.fields.contractStart),
  contractEndDate: optionalDateInput(c, c.d.panel.owners.fields.contractEnd),

  notes: optionalText(c, 2000),
});

/**
 * Umowa nie może kończyć się przed rozpoczęciem. Przy PATCH-u obie daty bywają
 * pominięte i wtedy nie ma czego porównywać — sprawdzenie przepuszcza taki
 * przypadek zamiast wymuszać przysyłanie obu pól przy zmianie samego telefonu.
 */
const contractPeriodOrdered = (data: {
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
}) => !data.contractStartDate || !data.contractEndDate || data.contractEndDate >= data.contractStartDate;

const contractPeriodIssue = (c: ValidationContext) => ({
  message: c.d.panel.owners.contractPeriodOrder,
  path: ["contractEndDate"],
});

export const ownerFormSchema = (c: ValidationContext) =>
  z.object(ownerFields(c)).refine(contractPeriodOrdered, contractPeriodIssue(c));

export type OwnerFormInput = z.input<ReturnType<typeof ownerFormSchema>>;
export type OwnerFormOutput = z.output<ReturnType<typeof ownerFormSchema>>;

export const ownerUpdateSchema = (c: ValidationContext) =>
  z.object(ownerFields(c)).partial().refine(contractPeriodOrdered, contractPeriodIssue(c));
export type OwnerUpdateOutput = z.output<ReturnType<typeof ownerUpdateSchema>>;

export const ownerListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export type OwnerListQuery = z.output<typeof ownerListQuerySchema>;

/**
 * Okres umowy jednym zdaniem: „1 wrz 2026 – 31 sie 2027" / „1 Sep 2026 – 31 Aug 2027".
 *
 * Daty leżą w bazie jako północ UTC, więc i formatujemy je w UTC — inaczej
 * serwer w innej strefie pokazywałby dzień wcześniej niż wpisano.
 * `null` dla umowy bez dat: wtedy wiersz w ogóle się nie pokazuje.
 */
const contractDateFormats = new Map<Locale, Intl.DateTimeFormat>();

function contractDateFormat(locale: Locale): Intl.DateTimeFormat {
  let formatter = contractDateFormats.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
      dateStyle: "medium",
      timeZone: "UTC",
    });
    contractDateFormats.set(locale, formatter);
  }
  return formatter;
}

export function formatContractPeriod(
  start: Date | null,
  end: Date | null,
  c: ValidationContext,
): string | null {
  const format = contractDateFormat(c.locale);
  const t = c.d.panel.owners.period;

  if (start && end) {
    return fill(t.range, { start: format.format(start), end: format.format(end) });
  }
  if (start) return fill(t.openEnded, { start: format.format(start) });
  if (end) return fill(t.until, { end: format.format(end) });
  return null;
}

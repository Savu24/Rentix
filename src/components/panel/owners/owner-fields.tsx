"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { DateInput } from "@/components/ui/date-input";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import type { OwnerFormInput } from "@/lib/validations/owner";

/**
 * Pola właściciela — te same na osobnej stronie i w kreatorze nieruchomości.
 *
 * Wydzielone jako sam zestaw pól, bez elementu `<form>`: w kreatorze
 * nieruchomości siedzą wewnątrz innego formularza, a zagnieżdżony `<form>`
 * jest niepoprawnym HTML-em i przeglądarka rozerwałaby go po swojemu.
 *
 * Prefiks `idPrefix` rozróżnia identyfikatory pól, gdy oba formularze stoją
 * na jednej stronie — bez tego etykiety wskazywałyby na cudze pola.
 */
export function OwnerFields({
  register,
  errors,
  disabled,
  idPrefix = "owner",
}: {
  register: UseFormRegister<OwnerFormInput>;
  errors: FieldErrors<OwnerFormInput>;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const { d } = useI18n();
  const t = d.panel.ownersPage.form;
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-6">
        <FormField
          id={id("name")}
          label={t.owner}
          error={errors.name?.message}
          hint={t.ownerHint}
          className="sm:col-span-4"
        >
          <Input
            {...fieldAria(id("name"), { error: errors.name?.message })}
            disabled={disabled}
            {...register("name")}
          />
        </FormField>

        <FormField
          id={id("taxId")}
          label={t.taxId}
          error={errors.taxId?.message}
          hint={t.taxIdHint}
          className="sm:col-span-2"
        >
          <Input
            {...fieldAria(id("taxId"), { error: errors.taxId?.message })}
            inputMode="numeric"
            disabled={disabled}
            {...register("taxId")}
          />
        </FormField>

        <FormField
          id={id("email")}
          label={t.email}
          error={errors.email?.message}
          className="sm:col-span-3"
        >
          <Input
            {...fieldAria(id("email"), { error: errors.email?.message })}
            type="email"
            disabled={disabled}
            {...register("email")}
          />
        </FormField>

        <FormField
          id={id("phone")}
          label={t.phone}
          error={errors.phone?.message}
          className="sm:col-span-3"
        >
          <Input
            {...fieldAria(id("phone"), { error: errors.phone?.message })}
            type="tel"
            disabled={disabled}
            {...register("phone")}
          />
        </FormField>

        <FormField
          id={id("street")}
          label={t.street}
          error={errors.street?.message}
          className="sm:col-span-6"
        >
          <Input
            {...fieldAria(id("street"), { error: errors.street?.message })}
            disabled={disabled}
            {...register("street")}
          />
        </FormField>

        <FormField
          id={id("postalCode")}
          label={t.postalCode}
          error={errors.postalCode?.message}
          className="sm:col-span-2"
        >
          <PostalCodeInput
            {...fieldAria(id("postalCode"), { error: errors.postalCode?.message })}
            disabled={disabled}
            {...register("postalCode")}
          />
        </FormField>

        <FormField
          id={id("city")}
          label={t.city}
          error={errors.city?.message}
          className="sm:col-span-4"
        >
          <Input
            {...fieldAria(id("city"), { error: errors.city?.message })}
            disabled={disabled}
            {...register("city")}
          />
        </FormField>

        <FormField
          id={id("bankAccount")}
          label={t.bankAccount}
          error={errors.bankAccount?.message}
          hint={t.bankAccountHint}
          className="sm:col-span-6"
        >
          <Input
            {...fieldAria(id("bankAccount"), { error: errors.bankAccount?.message })}
            inputMode="numeric"
            disabled={disabled}
            {...register("bankAccount")}
          />
        </FormField>
        <FormField
          id={id("contractStartDate")}
          label={t.contractFrom}
          error={errors.contractStartDate?.message}
          hint={t.contractFromHint}
          className="sm:col-span-3"
        >
          <DateInput
            {...fieldAria(id("contractStartDate"), { error: errors.contractStartDate?.message })}
            disabled={disabled}
            {...register("contractStartDate")}
          />
        </FormField>

        <FormField
          id={id("contractEndDate")}
          label={t.contractTo}
          error={errors.contractEndDate?.message}
          hint={t.contractToHint}
          className="sm:col-span-3"
        >
          <DateInput
            {...fieldAria(id("contractEndDate"), { error: errors.contractEndDate?.message })}
            disabled={disabled}
            {...register("contractEndDate")}
          />
        </FormField>
      </div>

      <FormField
        id={id("notes")}
        label={t.notes}
        error={errors.notes?.message}
        hint={t.notesHint}
      >
        <Textarea
          {...fieldAria(id("notes"), { error: errors.notes?.message })}
          disabled={disabled}
          {...register("notes")}
        />
      </FormField>
    </>
  );
}

export const EMPTY_OWNER: OwnerFormInput = {
  name: "",
  taxId: "",
  email: "",
  phone: "",
  street: "",
  postalCode: "",
  city: "",
  bankAccount: "",
  contractStartDate: "",
  contractEndDate: "",
  notes: "",
};

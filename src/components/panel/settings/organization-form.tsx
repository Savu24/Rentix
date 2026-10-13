"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { api } from "@/lib/api/client";
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
  type OrganizationSettingsOutput,
} from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";

/**
 * Dane wystawcy dokumentów (redesign/19-ustawienia-organizacja.svg).
 *
 * Trafiają na rachunek jako sprzedawca i na umowę jako wynajmujący.
 */
export function OrganizationForm({
  defaultValues,
}: {
  defaultValues: OrganizationSettingsInput;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.settings.seller;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationSettingsInput, unknown, OrganizationSettingsOutput>({
    resolver: zodResolver(organizationSettingsSchema(v)),
    defaultValues,
  });

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);
    setSaved(false);

    const result = await api.patch("/api/organization", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) {
          setError(field as keyof OrganizationSettingsInput, { message: messages[0] });
        }
      }
      setFormError(result.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <SectionCard title={t.title} icon={Receipt}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{t.saved}</Alert> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="org-name" label={t.name} error={errors.name?.message}>
            <Input
              {...fieldAria("org-name", { error: errors.name?.message })}
              disabled={isSubmitting}
              {...register("name")}
            />
          </FormField>

          <FormField id="org-taxId" label={`${t.taxId} (${d.panel.settings.optional})`} error={errors.taxId?.message}>
            <Input
              {...fieldAria("org-taxId", { error: errors.taxId?.message })}
              className="font-mono"
              disabled={isSubmitting}
              {...register("taxId")}
            />
          </FormField>
        </div>

        <FormField id="org-contactEmail" label={t.contactEmail} error={errors.contactEmail?.message}>
          <Input
            {...fieldAria("org-contactEmail", { error: errors.contactEmail?.message })}
            type="email"
            inputMode="email"
            disabled={isSubmitting}
            {...register("contactEmail")}
          />
        </FormField>

        <FormField id="org-street" label={t.street} error={errors.street?.message}>
          <Input
            {...fieldAria("org-street", { error: errors.street?.message })}
            disabled={isSubmitting}
            {...register("street")}
          />
        </FormField>

        <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-4">
          <FormField id="org-postalCode" label={t.postalCode} error={errors.postalCode?.message}>
            <PostalCodeInput
              {...fieldAria("org-postalCode", { error: errors.postalCode?.message })}
              disabled={isSubmitting}
              {...register("postalCode")}
            />
          </FormField>

          <FormField id="org-city" label={t.city} error={errors.city?.message}>
            <Input
              {...fieldAria("org-city", { error: errors.city?.message })}
              disabled={isSubmitting}
              {...register("city")}
            />
          </FormField>
        </div>

        <FormField id="org-bankAccount" label={t.bankAccount} error={errors.bankAccount?.message}>
          <Input
            {...fieldAria("org-bankAccount", { error: errors.bankAccount?.message })}
            inputMode={locale === "uk" ? "text" : "numeric"}
            autoComplete="off"
            className="font-mono"
            disabled={isSubmitting}
            {...register("bankAccount")}
          />
        </FormField>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : saved ? (
              <Check className="size-[18px]" aria-hidden />
            ) : null}
            {t.save}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

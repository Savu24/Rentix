"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PostalCodeInput } from "@/components/ui/postal-code-input";
import { api } from "@/lib/api/client";
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
  type OrganizationSettingsOutput,
} from "@/lib/validations/settings";

/**
 * Dane wystawcy dokumentów.
 *
 * Trafiają na rachunek jako sprzedawca i na umowę jako wynajmujący, więc
 * formularz mówi to wprost — inaczej „adres" w ustawieniach wygląda na
 * dekorację profilu.
 */
export function OrganizationForm({
  defaultValues,
}: {
  defaultValues: OrganizationSettingsInput;
}) {
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
    resolver: zodResolver(organizationSettingsSchema),
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">Dane wystawcy</h2>
          <p className="mt-0.5 text-sm text-muted">
            Trafiają na rachunki jako sprzedawca i na umowy najmu jako wynajmujący.
          </p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">Zapisano dane wystawcy.</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            id="org-name"
            label="Nazwa"
            error={errors.name?.message}
            hint="Firma albo imię i nazwisko, jeśli wynajmujesz prywatnie."
          >
            <Input
              {...fieldAria("org-name", { error: errors.name?.message })}
              disabled={isSubmitting}
              {...register("name")}
            />
          </FormField>

          <FormField
            id="org-contactEmail"
            label="Adres kontaktowy dla najemców"
            error={errors.contactEmail?.message}
            hint="Tu trafi odpowiedź, gdy najemca odpisze na powiadomienie o płatności."
          >
            <Input
              {...fieldAria("org-contactEmail", { error: errors.contactEmail?.message })}
              type="email"
              inputMode="email"
              disabled={isSubmitting}
              {...register("contactEmail")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="org-taxId"
              label="NIP"
              error={errors.taxId?.message}
              hint="Zostaw puste, jeśli wynajmujesz jako osoba fizyczna."
            >
              <Input
                {...fieldAria("org-taxId", { error: errors.taxId?.message })}
                disabled={isSubmitting}
                {...register("taxId")}
              />
            </FormField>

            <FormField id="org-street" label="Ulica i numer" error={errors.street?.message}>
              <Input
                {...fieldAria("org-street", { error: errors.street?.message })}
                disabled={isSubmitting}
                {...register("street")}
              />
            </FormField>

            <FormField id="org-postalCode" label="Kod pocztowy" error={errors.postalCode?.message}>
              <PostalCodeInput
                {...fieldAria("org-postalCode", { error: errors.postalCode?.message })}
                disabled={isSubmitting}
                {...register("postalCode")}
              />
            </FormField>

            <FormField id="org-city" label="Miejscowość" error={errors.city?.message}>
              <Input
                {...fieldAria("org-city", { error: errors.city?.message })}
                disabled={isSubmitting}
                {...register("city")}
              />
            </FormField>
          </div>

          <div>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : saved ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
              Zapisz
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

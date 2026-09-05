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
import { api } from "@/lib/api/client";
import {
  profileSettingsSchema,
  type ProfileSettingsInput,
  type ProfileSettingsOutput,
} from "@/lib/validations/settings";
import { useValidationContext } from "@/lib/i18n/client";
export function ProfileForm({
  email,
  defaultValues,
}: {
  email: string;
  defaultValues: ProfileSettingsInput;
}) {
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
  } = useForm<ProfileSettingsInput, unknown, ProfileSettingsOutput>({
    resolver: zodResolver(profileSettingsSchema(v)),
    defaultValues,
  });

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);
    setSaved(false);

    const result = await api.patch("/api/me", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof ProfileSettingsInput, { message: messages[0] });
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
          <h2 className="text-[15px] font-semibold text-fg">Twój profil</h2>
          <p className="mt-0.5 text-sm text-muted">Widoczne tylko dla Ciebie w panelu.</p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">Zapisano profil.</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="profile-name" label="Imię i nazwisko" error={errors.name?.message}>
              <Input
                {...fieldAria("profile-name", { error: errors.name?.message })}
                disabled={isSubmitting}
                {...register("name")}
              />
            </FormField>

            <FormField id="profile-phone" label="Telefon" error={errors.phone?.message}>
              <Input
                {...fieldAria("profile-phone", { error: errors.phone?.message })}
                disabled={isSubmitting}
                {...register("phone")}
              />
            </FormField>
          </div>

          {/* E-mail jest loginem — jego zmiana wymaga potwierdzenia nowego
              adresu, więc pokazujemy go tylko do odczytu. */}
          <FormField
            id="profile-email"
            label="E-mail"
            hint="Służy do logowania. Zmiana adresu wymaga kontaktu z pomocą."
          >
            <Input id="profile-email" value={email} readOnly disabled />
          </FormField>

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

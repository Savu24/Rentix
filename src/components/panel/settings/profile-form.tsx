"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import {
  profileSettingsSchema,
  type ProfileSettingsInput,
  type ProfileSettingsOutput,
} from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
export function ProfileForm({
  email,
  defaultValues,
}: {
  email: string;
  defaultValues: ProfileSettingsInput;
}) {
  const { d } = useI18n();
  const t = d.panel.settings.profile;
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
    <SectionCard title={t.title} icon={User}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{t.saved}</Alert> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="profile-name" label={t.name} error={errors.name?.message}>
            <Input
              {...fieldAria("profile-name", { error: errors.name?.message })}
              disabled={isSubmitting}
              {...register("name")}
            />
          </FormField>

          <FormField id="profile-phone" label={t.phone} error={errors.phone?.message}>
            <Input
              {...fieldAria("profile-phone", { error: errors.phone?.message })}
              type="tel"
              className="font-mono"
              disabled={isSubmitting}
              {...register("phone")}
            />
          </FormField>

          {/* E-mail jest loginem — jego zmiana wymaga potwierdzenia nowego
              adresu, więc pokazujemy go tylko do odczytu, z kłódką. */}
          <FormField id="profile-email" label={t.email}>
            <div className="relative">
              <Input id="profile-email" value={email} readOnly disabled className="pr-10" />
              <Lock
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle"
                aria-hidden
              />
            </div>
          </FormField>

          <div className="flex items-end justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : saved ? (
                <Check className="size-[18px]" aria-hidden />
              ) : null}
              {d.panel.settings.seller.save}
            </Button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
}

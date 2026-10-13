"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { EMPTY_OWNER, OwnerFields } from "@/components/panel/owners/owner-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/panel/form-section";
import { api } from "@/lib/api/client";
import {
  ownerFormSchema,
  type OwnerFormInput,
  type OwnerFormOutput,
} from "@/lib/validations/owner";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
export function OwnerForm({
  ownerId,
  defaultValues,
}: {
  ownerId?: string;
  defaultValues?: Partial<OwnerFormInput>;
}) {
  const { d } = useI18n();
  const t = d.panel.ownersPage.form;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(ownerId);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerFormInput, unknown, OwnerFormOutput>({
    resolver: zodResolver(ownerFormSchema(v)),
    defaultValues: { ...EMPTY_OWNER, ...defaultValues },
  });

  /** Surowe wartości pól — patrz komentarz w `property-form.tsx`. */
  async function onSubmit() {
    setFormError(null);

    const result = isEdit
      ? await api.patch<{ id: string }>(`/api/owners/${ownerId}`, getValues())
      : await api.post<{ id: string }>("/api/owners", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field in EMPTY_OWNER && messages[0]) {
          setError(field as keyof OwnerFormInput, { message: messages[0] });
        }
      }
      setFormError(result.message);
      return;
    }

    router.push(`/panel/wlasciciele/${isEdit ? ownerId : result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormSection title={t.title} icon={UserRound} collapsible={false}>

          <OwnerFields register={register} errors={errors} disabled={isSubmitting} />
        </FormSection>

      <div className="flex flex-row-reverse flex-wrap justify-start gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : null}
          {isEdit ? t.save : d.panel.ownersPage.add}
        </Button>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => router.back()}>
          {d.panel.common.cancel}
        </Button>
      </div>
    </form>
  );
}

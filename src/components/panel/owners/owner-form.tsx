"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { EMPTY_OWNER, OwnerFields } from "@/components/panel/owners/owner-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import {
  ownerFormSchema,
  type OwnerFormInput,
  type OwnerFormOutput,
} from "@/lib/validations/owner";
import { useValidationContext } from "@/lib/i18n/client";
export function OwnerForm({
  ownerId,
  defaultValues,
}: {
  ownerId?: string;
  defaultValues?: Partial<OwnerFormInput>;
}) {
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Dane właściciela</h2>
            <p className="mt-0.5 text-sm text-muted">
              Właściciel lokalu, który obsługujesz w podnajmie. Nie jest stroną umowy
              z najemcą, tą pozostajesz Ty.
            </p>
          </div>

          <OwnerFields register={register} errors={errors} disabled={isSubmitting} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Zapisz zmiany" : "Dodaj właściciela"}
        </Button>
        <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

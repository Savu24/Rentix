"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { passwordChangeSchema, type PasswordChangeInput } from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
/**
 * Zmiana hasła.
 *
 * Bez `router.refresh()` po zapisie: hasło nie zmienia niczego, co widać na
 * stronie, a odświeżenie tylko mignęłoby układem bez powodu.
 */
export function PasswordForm() {
  const { d } = useI18n();
  const t = d.panel.settings.password;
  const v = useValidationContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema(v)),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  async function onSubmit() {
    setFormError(null);
    setChanged(false);

    const result = await api.post("/api/me/password", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof PasswordChangeInput, { message: messages[0] });
      }
      // Komunikat ogólny pomijamy, gdy błąd dotyczy konkretnego pola —
      // „Popraw zaznaczone pola" nad podświetlonym polem nic nie wnosi.
      if (!result.fields) setFormError(result.message);
      return;
    }

    // Hasła nie zostawiamy w polach po udanej zmianie.
    reset({ currentPassword: "", newPassword: "" });
    setChanged(true);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {t.newHint}
          </p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {changed ? <Alert tone="success">{t.changed}</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="currentPassword"
              label={t.current}
              error={errors.currentPassword?.message}
            >
              <Input
                {...fieldAria("currentPassword", { error: errors.currentPassword?.message })}
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting}
                {...register("currentPassword")}
              />
            </FormField>

            <FormField id="newPassword" label={t.new} error={errors.newPassword?.message}>
              <Input
                {...fieldAria("newPassword", { error: errors.newPassword?.message })}
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("newPassword")}
              />
            </FormField>
          </div>

          <div>
            <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : changed ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
              {d.panel.panelMisc.changePassword}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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
  notificationSettingsSchema,
  type NotificationSettingsInput,
  type NotificationSettingsOutput,
} from "@/lib/validations/settings";

/**
 * Rytm przypominania i nazwa nadawcy.
 *
 * Obie liczby były do niedawna stałymi w kodzie. Wypuszczamy je do panelu, bo
 * rytm płatności bywa różny: najem krótkoterminowy chce przypomnienia dzień
 * przed terminem, długi najem firmowy — tydzień.
 */
export function NotificationForm({
  defaultValues,
  organizationName,
  contactEmail,
}: {
  defaultValues: NotificationSettingsInput;
  organizationName: string;
  contactEmail: string | null;
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
  } = useForm<NotificationSettingsInput, unknown, NotificationSettingsOutput>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues,
  });

  async function onSubmit() {
    setFormError(null);
    setSaved(false);

    const result = await api.patch("/api/notifications/settings", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) {
          setError(field as keyof NotificationSettingsInput, { message: messages[0] });
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
          <h2 className="text-[15px] font-semibold text-fg">Nadawca i terminy</h2>
          <p className="mt-0.5 text-sm text-muted">
            Kiedy przypomnienia wychodzą i pod jaką nazwą widzi je najemca.
          </p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">Zapisano ustawienia powiadomień.</Alert> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            id="notif-senderName"
            label="Nazwa nadawcy"
            error={errors.senderName?.message}
            hint={`Widoczna w skrzynce najemcy. Puste pole = „${organizationName}".`}
          >
            <Input
              {...fieldAria("notif-senderName", { error: errors.senderName?.message })}
              placeholder={organizationName}
              disabled={isSubmitting}
              {...register("senderName")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="notif-reminderDaysBefore"
              label="Przypomnienie na ile dni przed terminem"
              error={errors.reminderDaysBefore?.message}
            >
              <Input
                {...fieldAria("notif-reminderDaysBefore", {
                  error: errors.reminderDaysBefore?.message,
                })}
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                disabled={isSubmitting}
                {...register("reminderDaysBefore")}
              />
            </FormField>

            <FormField
              id="notif-overdueRepeatDays"
              label="Wezwanie po terminie co ile dni"
              error={errors.overdueRepeatDays?.message}
              hint="Codzienne wezwania trafiają do spamu i przestają docierać."
            >
              <Input
                {...fieldAria("notif-overdueRepeatDays", {
                  error: errors.overdueRepeatDays?.message,
                })}
                type="number"
                inputMode="numeric"
                min={2}
                max={60}
                disabled={isSubmitting}
                {...register("overdueRepeatDays")}
              />
            </FormField>
          </div>

          {/*
            Adres odpowiedzi ustawia się w zakładce „Organizacja", ale jego brak
            boli właśnie tutaj: bez niego odpowiedź najemcy na powiadomienie idzie
            na skrzynkę platformy, czyli w próżnię.
          */}
          {!contactEmail ? (
            <Alert tone="warning">
              Nie masz adresu kontaktowego — odpowiedzi najemców nie mają dokąd trafić. Uzupełnij
              go w zakładce Organizacja.
            </Alert>
          ) : null}

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

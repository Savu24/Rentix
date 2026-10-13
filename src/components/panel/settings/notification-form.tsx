"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/panel/section-card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import {
  notificationSettingsSchema,
  type NotificationSettingsInput,
  type NotificationSettingsOutput,
} from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
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
  const { d } = useI18n();
  const t = d.panel.settings.notifications;
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
  } = useForm<NotificationSettingsInput, unknown, NotificationSettingsOutput>({
    resolver: zodResolver(notificationSettingsSchema(v)),
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

  const daysField = (name: "reminderDaysBefore" | "overdueRepeatDays", label: string, min: number, max: number) => {
    const id = `notif-${name}`;
    const error = errors[name]?.message;
    return (
      <FormField id={id} label={label} error={error}>
        <div className="relative">
          <Input
            {...fieldAria(id, { error })}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            className="pr-12 font-mono"
            disabled={isSubmitting}
            {...register(name)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-subtle">
            {t.daysUnit}
          </span>
        </div>
      </FormField>
    );
  };

  return (
    <SectionCard
      title={t.title}
      icon={Send}
      actions={
        <InfoTip label={t.overdueInfo} align="end">
          {t.overdueHint}
        </InfoTip>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{t.saved}</Alert> : null}

        {/*
          Adres odpowiedzi ustawia się w zakładce „Organizacja", ale jego brak
          boli właśnie tutaj: bez niego odpowiedź najemcy na powiadomienie idzie
          na skrzynkę platformy, czyli w próżnię.
        */}
        {!contactEmail ? (
          <Alert
            tone="warning"
            action={
              <Link href="/panel/ustawienia" className="hover:underline">
                {t.openOrganization}
              </Link>
            }
          >
            {t.noContactEmail}
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Puste pole = nazwa organizacji; widać ją jako podpowiedź w polu. */}
          <FormField id="notif-senderName" label={t.senderName} error={errors.senderName?.message}>
            <Input
              {...fieldAria("notif-senderName", { error: errors.senderName?.message })}
              placeholder={organizationName}
              disabled={isSubmitting}
              {...register("senderName")}
            />
          </FormField>
          {daysField("reminderDaysBefore", t.reminderDays, 1, 30)}
          {daysField("overdueRepeatDays", t.overdueDays, 2, 60)}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : saved ? (
              <Check className="size-[18px]" aria-hidden />
            ) : null}
            {d.panel.settings.seller.save}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { templateVariables } from "@/lib/email/render";
import { sampleInvoiceData } from "@/lib/email/sample";
import {
  DEFAULT_FIELDS,
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type TemplateFields,
} from "@/lib/email/templates";
import type { EditableNotificationType } from "@/lib/notifications/types";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validations/settings";
import { useI18n, useValidationContext } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";

/**
 * Edytor treści jednego powiadomienia, z podglądem obok pól.
 *
 * Podgląd liczy się w przeglądarce, nie na serwerze. Moduł szablonów nie ciągnie
 * za sobą ani bazy, ani bramki pocztowej (typ `EmailContent` wchodzi jako
 * `import type`, więc znika przy kompilacji), a `money.ts` nie ma żadnych
 * importów — całość składa się w bundlu strony. Dzięki temu tekst przerysowuje
 * się pod palcami, zamiast czekać na odpowiedź serwera po każdej literze.
 */

function buildContent(
  type: EditableNotificationType,
  landlordName: string,
  fields: TemplateFields,
  locale: Locale,
) {
  const data = sampleInvoiceData(landlordName, locale);

  switch (type) {
    case "PAYMENT_OVERDUE":
      return paymentOverdueEmail({ ...data, attached: false }, fields);
    case "PAYMENT_REMINDER":
      return paymentReminderEmail({ ...data, attached: false }, fields);
    default:
      return invoiceIssuedEmail(data, fields);
  }
}

export function TemplateEditor({
  type,
  landlordName,
  defaultValues,
}: {
  type: EditableNotificationType;
  landlordName: string;
  defaultValues: { subject: string; heading: string; intro: string; outro: string };
}) {
  const { d, locale } = useI18n();
  const te = d.panel.panelMisc.templateEditor;
  const misc = d.panel.panelMisc;
  const nt = d.panel.settings.notifications;
  const types = nt.types;
  const v = useValidationContext();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<
    { status: "idle" } | { status: "sending" } | { status: "sent"; email: string } | { status: "error"; message: string }
  >({ status: "idle" });

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EmailTemplateInput>({
    resolver: zodResolver(emailTemplateSchema(v)),
    // `enabled` nie jest polem tego formularza — przełącznik stoi w zakładce
    // „Powiadomienia". Wysyłamy wartość, którą serwer i tak trzyma, żeby
    // schemat pozostał jeden dla całego wiersza.
    defaultValues: { type, enabled: true, ...defaultValues },
  });

  const watched = useWatch({ control });

  /**
   * Podgląd na przykładowym dokumencie.
   *
   * Puste pole daje tekst domyślny — dokładnie ten, który wyjdzie do najemcy.
   * To jest sens tego podglądu: wynajmujący pisze wiadomość, której sam nigdy
   * nie zobaczy w skrzynce.
   */
  const preview = useMemo(
    () =>
      buildContent(
        type,
        landlordName,
        {
          subject: watched.subject ?? "",
          heading: watched.heading ?? "",
          intro: watched.intro ?? "",
          outro: watched.outro ?? "",
        },
        locale,
      ),
    [
      type,
      landlordName,
      locale,
      watched.subject,
      watched.heading,
      watched.intro,
      watched.outro,
    ],
  );

  /** Domyślki jako podpowiedzi w tle pustych pól. */
  const defaults = useMemo(() => {
    const data = sampleInvoiceData(landlordName, locale);
    return type === "PAYMENT_OVERDUE"
      ? DEFAULT_FIELDS.PAYMENT_OVERDUE(data)
      : type === "PAYMENT_REMINDER"
        ? DEFAULT_FIELDS.PAYMENT_REMINDER(data)
        : DEFAULT_FIELDS.INVOICE_ISSUED(data);
  }, [type, landlordName, locale]);

  async function onSubmit() {
    setFormError(null);
    setSaved(false);

    const result = await api.put("/api/notifications/templates", getValues());

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (messages[0]) setError(field as keyof EmailTemplateInput, { message: messages[0] });
      }
      setFormError(result.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function sendTest() {
    setTestState({ status: "sending" });

    const result = await api.post("/api/notifications/test", { type });

    if (!result.ok) {
      setTestState({ status: "error", message: result.message });
      return;
    }

    setTestState({
      status: "sent",
      email: (result.data as { toEmail: string }).toEmail,
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 lg:p-6"
      >
        <h2 className="sr-only">{types[type].label}</h2>
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">{te.saved}</Alert> : null}

        {/* Puste pole = tekst domyślny — stoi w tle pola jako podpowiedź. */}
        <FormField id={`tpl-${type}-subject`} label={te.subject} error={errors.subject?.message}>
          <Input
            {...fieldAria(`tpl-${type}-subject`, { error: errors.subject?.message })}
            placeholder={defaults.subject}
            className="font-mono"
            disabled={isSubmitting}
            {...register("subject")}
          />
        </FormField>

        <FormField id={`tpl-${type}-heading`} label={te.heading} error={errors.heading?.message}>
          <Input
            {...fieldAria(`tpl-${type}-heading`, { error: errors.heading?.message })}
            placeholder={defaults.heading}
            disabled={isSubmitting}
            {...register("heading")}
          />
        </FormField>

        <FormField id={`tpl-${type}-intro`} label={te.intro} error={errors.intro?.message}>
          <Textarea
            {...fieldAria(`tpl-${type}-intro`, { error: errors.intro?.message })}
            rows={4}
            placeholder={defaults.intro}
            disabled={isSubmitting}
            {...register("intro")}
          />
        </FormField>

        <FormField id={`tpl-${type}-outro`} label={te.outro} error={errors.outro?.message}>
          <Textarea
            {...fieldAria(`tpl-${type}-outro`, { error: errors.outro?.message })}
            rows={3}
            placeholder={defaults.outro}
            disabled={isSubmitting}
            {...register("outro")}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1 text-[13px] font-[550] text-fg">
            {te.variables}
            <InfoTip label={te.variablesInfo}>{te.variablesHint}</InfoTip>
          </p>
          <ul className="flex flex-wrap gap-2">
            {templateVariables(d).map((variable) => (
              <li key={variable.name}>
                <Badge tone="outline" title={variable.description} className="font-mono">
                  {`{{${variable.name}}}`}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {testState.status === "sent" ? (
          <Alert tone="success">{fill(misc.testSent, { email: testState.email })}</Alert>
        ) : null}
        {testState.status === "error" ? <Alert tone="error">{testState.message}</Alert> : null}

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={sendTest} disabled={testState.status === "sending"}>
              {testState.status === "sending" ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <Send className="size-[18px]" aria-hidden />
              )}
              {misc.sendTestToSelf}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-[18px] animate-spin" aria-hidden />
              ) : saved ? (
                <Check className="size-[18px]" aria-hidden />
              ) : null}
              {d.panel.settings.seller.save}
            </Button>
          </div>
          {/*
            Test wysyła treść *zapisaną*, nie tę z pól. Bez tej linijki łatwo
            uznać, że przycisk nie działa, bo w skrzynce ląduje poprzednia
            wersja tekstu.
          */}
          {isDirty ? <p className="text-right text-[12.5px] text-muted">{te.testHint}</p> : null}
        </div>
      </form>

      <section className="flex flex-col gap-3 rounded-tile border border-border bg-surface p-4 lg:p-5">
        <div className="flex flex-col gap-0.5 px-1">
          <h3 className="text-sm font-[550] text-muted">{misc.previewTitle}</h3>
          <p className="text-[13px] text-muted">
            {misc.previewSubject} <span className="font-[550] text-fg">{preview.subject}</span>
          </p>
        </div>

        {/*
          Podgląd w ramce, a nie wstrzyknięty w stronę.

          Wiadomość niesie własne `<body>` i style w atrybutach; wpuszczona
          wprost w panel dziedziczyłaby jego czcionki i tła, więc pokazywałaby
          coś, czego najemca nigdy nie zobaczy. `sandbox` bez uprawnień
          wyłącza skrypty — treść pochodzi z pola tekstowego użytkownika.
        */}
        <iframe
          title={fill(misc.previewFrameTitle, { type: types[type].label })}
          sandbox=""
          srcDoc={preview.html}
          className="h-[480px] w-full rounded-alert border border-border bg-on-color lg:h-[560px]"
        />
      </section>
    </div>
  );
}

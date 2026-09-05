"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fieldAria, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { TEMPLATE_VARIABLES } from "@/lib/email/render";
import { sampleInvoiceData } from "@/lib/email/sample";
import {
  DEFAULT_FIELDS,
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type TemplateFields,
} from "@/lib/email/templates";
import {
  NOTIFICATION_TYPE_HINTS,
  NOTIFICATION_TYPE_LABELS,
  type EditableNotificationType,
} from "@/lib/notifications/types";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validations/settings";
import { useValidationContext } from "@/lib/i18n/client";
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
) {
  const data = sampleInvoiceData(landlordName);

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
      buildContent(type, landlordName, {
        subject: watched.subject ?? "",
        heading: watched.heading ?? "",
        intro: watched.intro ?? "",
        outro: watched.outro ?? "",
      }),
    [type, landlordName, watched.subject, watched.heading, watched.intro, watched.outro],
  );

  /** Domyślki jako podpowiedzi w tle pustych pól. */
  const defaults = useMemo(() => {
    const data = sampleInvoiceData(landlordName);
    return type === "PAYMENT_OVERDUE"
      ? DEFAULT_FIELDS.PAYMENT_OVERDUE(data)
      : type === "PAYMENT_REMINDER"
        ? DEFAULT_FIELDS.PAYMENT_REMINDER(data)
        : DEFAULT_FIELDS.INVOICE_ISSUED(data);
  }, [type, landlordName]);

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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{NOTIFICATION_TYPE_LABELS[type]}</h2>
          <p className="mt-0.5 text-sm text-muted">{NOTIFICATION_TYPE_HINTS[type]}</p>
        </div>

        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">Zapisano treść wiadomości.</Alert> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <FormField
              id={`tpl-${type}-subject`}
              label="Temat"
              error={errors.subject?.message}
              hint="Puste pole = tekst domyślny, pokazany w tle."
            >
              <Input
                {...fieldAria(`tpl-${type}-subject`, { error: errors.subject?.message })}
                placeholder={defaults.subject}
                disabled={isSubmitting}
                {...register("subject")}
              />
            </FormField>

            <FormField
              id={`tpl-${type}-heading`}
              label="Nadpis nad treścią"
              error={errors.heading?.message}
            >
              <Input
                {...fieldAria(`tpl-${type}-heading`, { error: errors.heading?.message })}
                placeholder={defaults.heading}
                disabled={isSubmitting}
                {...register("heading")}
              />
            </FormField>

            <FormField
              id={`tpl-${type}-intro`}
              label="Akapit powitalny"
              error={errors.intro?.message}
            >
              <Textarea
                {...fieldAria(`tpl-${type}-intro`, { error: errors.intro?.message })}
                rows={4}
                placeholder={defaults.intro}
                disabled={isSubmitting}
                {...register("intro")}
              />
            </FormField>

            <FormField
              id={`tpl-${type}-outro`}
              label="Akapit zamykający"
              error={errors.outro?.message}
            >
              <Textarea
                {...fieldAria(`tpl-${type}-outro`, { error: errors.outro?.message })}
                rows={3}
                placeholder={defaults.outro}
                disabled={isSubmitting}
                {...register("outro")}
              />
            </FormField>

            <div className="rounded-card border border-border bg-surface-alt p-3">
              <p className="text-xs font-medium text-fg">Zmienne do wstawienia</p>
              <p className="mt-0.5 text-xs text-muted">
                Wpisz nazwę w podwójnych klamrach. Podstawi się dana z dokumentu.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <li key={variable.name}>
                    <span
                      title={variable.description}
                      className="tabular inline-block rounded-btn border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted"
                    >
                      {`{{${variable.name}}}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : saved ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : null}
                Zapisz
              </Button>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={sendTest}
                disabled={testState.status === "sending"}
              >
                {testState.status === "sending" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Wyślij test do siebie
              </Button>
            </div>

            {/*
              Test wysyła treść *zapisaną*, nie tę z pól. Bez tego zdania łatwo
              uznać, że przycisk nie działa, bo w skrzynce ląduje poprzednia
              wersja tekstu.
            */}
            {isDirty ? (
              <p className="text-xs text-muted">
                Test wyśle ostatnio zapisaną wersję. Zapisz najpierw, żeby sprawdzić zmiany.
              </p>
            ) : null}

            {testState.status === "sent" ? (
              <Alert tone="success">Wysłano próbkę na {testState.email}.</Alert>
            ) : null}
            {testState.status === "error" ? (
              <Alert tone="error">{testState.message}</Alert>
            ) : null}
          </form>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-fg">Podgląd</p>
              <p className="text-xs text-muted">
                Temat: <span className="text-fg">{preview.subject}</span>
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
              title={`Podgląd wiadomości: ${NOTIFICATION_TYPE_LABELS[type]}`}
              sandbox=""
              srcDoc={preview.html}
              className="h-[420px] w-full rounded-card border border-border bg-white"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

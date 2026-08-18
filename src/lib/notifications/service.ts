import { sendEmail } from "@/lib/email/client";
import { sampleInvoiceData } from "@/lib/email/sample";
import {
  invoiceIssuedEmail,
  paymentOverdueEmail,
  paymentReminderEmail,
  type EmailTemplateType,
  type TemplateFields,
} from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import type {
  EmailTemplateOutput,
  NotificationSettingsOutput,
} from "@/lib/validations/settings";

import { organizationMailSettings } from "./settings";
import { EDITABLE_NOTIFICATION_TYPES, type EditableNotificationType } from "./types";

/**
 * Ustawienia powiadomień w panelu: rytm, nadawca i treści.
 */

export type TemplateRow = {
  type: EditableNotificationType;
  enabled: boolean;
  subject: string;
  heading: string;
  intro: string;
  outro: string;
};

export type NotificationPanelData = {
  senderName: string;
  /** Nazwa organizacji — podpowiedź w pustym polu nadawcy. */
  organizationName: string;
  contactEmail: string | null;
  reminderDaysBefore: number;
  overdueRepeatDays: number;
  templates: TemplateRow[];
};

/**
 * Dane obu zakładek pocztowych naraz.
 *
 * Puste pole tekstowe w wyniku to nie brak danych, tylko „tutaj obowiązuje
 * domyślka" — formularz pokazuje ją wtedy jako podpowiedź w tle pola, a nie
 * jako wpisaną wartość. Wstawienie domyślki jako wartości byłoby wygodniejsze
 * w kodzie i mylące w użyciu: wynajmujący nie odróżniłby tekstu, który sam
 * zatwierdził, od tekstu, który zastanie każdy nowy użytkownik.
 */
export async function getNotificationPanelData(
  organizationId: string,
): Promise<NotificationPanelData | null> {
  const [organization, templates] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        senderName: true,
        contactEmail: true,
        reminderDaysBefore: true,
        overdueRepeatDays: true,
      },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId },
      select: { type: true, subject: true, heading: true, intro: true, outro: true, enabled: true },
    }),
  ]);

  if (!organization) return null;

  const byType = new Map(templates.map((template) => [template.type, template]));

  return {
    senderName: organization.senderName ?? "",
    organizationName: organization.name,
    contactEmail: organization.contactEmail,
    reminderDaysBefore: organization.reminderDaysBefore,
    overdueRepeatDays: organization.overdueRepeatDays,
    templates: EDITABLE_NOTIFICATION_TYPES.map((type) => {
      const saved = byType.get(type);
      return {
        type,
        enabled: saved?.enabled ?? true,
        subject: saved?.subject ?? "",
        heading: saved?.heading ?? "",
        intro: saved?.intro ?? "",
        outro: saved?.outro ?? "",
      };
    }),
  };
}

export async function updateNotificationSettings(
  organizationId: string,
  data: NotificationSettingsOutput,
) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      senderName: data.senderName,
      reminderDaysBefore: data.reminderDaysBefore,
      overdueRepeatDays: data.overdueRepeatDays,
    },
    select: {
      senderName: true,
      reminderDaysBefore: true,
      overdueRepeatDays: true,
    },
  });
}

/**
 * Zapisuje treść jednego rodzaju powiadomienia.
 *
 * Upsert, nie insert-albo-update ręcznie: wiersz powstaje dopiero przy
 * pierwszej zmianie, a klucz `(organizationId, type)` gwarantuje, że dwa
 * jednoczesne zapisy z dwóch kart przeglądarki nie zrobią duplikatu.
 */
export async function saveEmailTemplate(organizationId: string, data: EmailTemplateOutput) {
  const fields = {
    subject: data.subject,
    heading: data.heading,
    intro: data.intro,
    outro: data.outro,
    enabled: data.enabled,
  };

  return prisma.emailTemplate.upsert({
    where: { organizationId_type: { organizationId, type: data.type } },
    create: { organizationId, type: data.type, ...fields },
    update: fields,
    select: { type: true, enabled: true, subject: true, heading: true, intro: true, outro: true },
  });
}

/**
 * Włącza albo wyłącza automatyczną wysyłkę jednego rodzaju.
 *
 * Osobno od zapisu treści, mimo że obie operacje siedzą w tym samym wierszu.
 * Przełącznik stoi w zakładce „Powiadomienia", a teksty w „Wiadomościach" —
 * gdyby przełącznik wysyłał cały wiersz, przestawienie go po edycji treści
 * w drugiej zakładce cofnęłoby tamtą zmianę do stanu, który formularz miał
 * wczytany przy wejściu na stronę.
 */
export async function setTemplateEnabled(
  organizationId: string,
  type: EditableNotificationType,
  enabled: boolean,
) {
  return prisma.emailTemplate.upsert({
    where: { organizationId_type: { organizationId, type } },
    create: { organizationId, type, enabled },
    update: { enabled },
    select: { type: true, enabled: true },
  });
}

/** Buduje wiadomość danego rodzaju na przykładowych danych. */
export function buildPreview(
  type: EmailTemplateType,
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

export type TestSendResult =
  | { ok: true; toEmail: string }
  | { ok: false; reason: "NO_RECIPIENT" }
  | { ok: false; reason: "SEND_FAILED"; error: string };

/**
 * Wysyła próbkę na adres zalogowanego wynajmującego.
 *
 * Bez zapisu w `notifications`: tamta tabela jest historią korespondencji
 * z najemcami, a test do samego siebie nie jest korespondencją — zaśmiecałby
 * też regułę „nie wysyłaj drugi raz tego, co już poszło".
 */
export async function sendTestEmail(
  organizationId: string,
  type: EmailTemplateType,
  toEmail: string | null,
): Promise<TestSendResult> {
  if (!toEmail) return { ok: false, reason: "NO_RECIPIENT" };

  const settings = await organizationMailSettings(organizationId);
  const content = buildPreview(type, settings.senderName, settings.templates.get(type) ?? {});

  const result = await sendEmail({
    to: toEmail,
    fromName: settings.senderName,
    replyTo: settings.replyTo,
    subject: `[TEST] ${content.subject}`,
    html: content.html,
    text: content.text,
  });

  if (!result.ok) return { ok: false, reason: "SEND_FAILED", error: result.error };
  return { ok: true, toEmail };
}

import type { NotificationType } from "@/generated/prisma/enums";
import { planAllows } from "@/lib/billing/features";
import { DEFAULT_PLAN } from "@/lib/billing/plans";
import type { TemplateFields } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

import { type NotificationSchedule } from "./schedule";
import { EDITABLE_NOTIFICATION_TYPES } from "./types";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

export {
  EDITABLE_NOTIFICATION_TYPES,
  isEditableType,
  type EditableNotificationType,
} from "./types";

/**
 * Ustawienia poczty jednej organizacji: rytm przypominania, nazwa nadawcy
 * i teksty napisane przez wynajmującego.
 */

export type MailSettings = {
  /**
   * Kraj konta — język wiadomości do najemcy.
   *
   * Nie bierze się z przeglądarki: te wiadomości czyta najemca, człowiek spoza
   * systemu, a wysyła je często cron, który żadnej przeglądarki nie ma.
   */
  locale: Locale;
  /** Nazwa w polu nadawcy — własna albo nazwa organizacji. */
  senderName: string;
  replyTo: string | null;
  schedule: NotificationSchedule;
  /** Rodzaje, które wychodzą automatycznie. Ręcznej wysyłki nie ogranicza. */
  enabled: Set<NotificationType>;
  templates: Map<NotificationType, TemplateFields>;
};

/**
 * Wczytuje ustawienia poczty organizacji.
 *
 * Brak wiersza w `email_templates` to stan normalny, a nie brak danych: konto,
 * które niczego nie zmieniało, ma wysyłać teksty domyślne z kodu.
 */
export async function organizationMailSettings(organizationId: string): Promise<MailSettings> {
  const [organization, templates] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        locale: true,
        senderName: true,
        contactEmail: true,
        reminderDaysBefore: true,
        overdueRepeatDays: true,
        // Plan idzie tym samym zapytaniem: własne teksty wchodzą z progiem Pro,
        // a nocny przebieg pyta o ustawienia raz na organizację.
        subscription: { select: { plan: true } },
      },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId },
      select: { type: true, subject: true, heading: true, intro: true, outro: true, enabled: true },
    }),
  ]);

  const enabled = new Set<NotificationType>(EDITABLE_NOTIFICATION_TYPES);
  const byType = new Map<NotificationType, TemplateFields>();

  /*
    Własne teksty wchodzą z planem Pro; niższy próg dostaje wiadomości
    domyślne. Przełącznik automatycznej wysyłki obowiązuje niezależnie od
    planu — rytm przypominania ma każde konto, a wyłączony automat musi
    zostać wyłączony także po spadku na niższy próg.
  */
  const ownTemplates = planAllows(
    organization?.subscription?.plan ?? DEFAULT_PLAN,
    "MESSAGE_TEMPLATES",
  );

  for (const template of templates) {
    if (!template.enabled) enabled.delete(template.type);
    if (!ownTemplates) continue;

    byType.set(template.type, {
      subject: template.subject,
      heading: template.heading,
      intro: template.intro,
      outro: template.outro,
    });
  }

  return {
    locale: isLocale(organization?.locale) ? organization.locale : DEFAULT_LOCALE,
    senderName: organization?.senderName?.trim() || organization?.name || "",
    replyTo: organization?.contactEmail ?? null,
    schedule: {
      reminderDaysBefore: organization?.reminderDaysBefore ?? 7,
      overdueRepeatDays: organization?.overdueRepeatDays ?? 7,
    },
    enabled,
    templates: byType,
  };
}

/**
 * Wczytywanie z pamięcią w obrębie jednego przebiegu.
 *
 * Nocny cron idzie po fakturach wszystkich organizacji naraz i przy stu
 * dokumentach jednego wynajmującego odpytywałby o te same ustawienia sto razy.
 * Pamięć żyje tyle, co przebieg — zmiana ustawień w panelu w trakcie nocnej
 * wysyłki nie ma prawa rozjechać jej w połowie.
 */
export function mailSettingsLoader(): (organizationId: string) => Promise<MailSettings> {
  const cache = new Map<string, Promise<MailSettings>>();

  return (organizationId: string) => {
    const cached = cache.get(organizationId);
    if (cached) return cached;

    const loading = organizationMailSettings(organizationId);
    cache.set(organizationId, loading);
    return loading;
  };
}

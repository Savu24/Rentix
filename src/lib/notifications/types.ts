import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Rodzaje powiadomień w interfejsie — nazwy i opisy.
 *
 * Osobny moduł od `settings.ts`, mimo że treścią blisko mu do tamtego: tam
 * mieszka `prisma`, a te stałe czyta formularz w przeglądarce. Jeden wspólny
 * plik wciągnąłby klienta bazy do bundla strony.
 */

/**
 * Rodzaje, których treść wynajmujący może edytować.
 *
 * `NotificationType` ma siedem wartości, ale cztery z nich (zgłoszenia,
 * wiadomości, kończące się umowy, prośby o odczyt) nie chodzą jeszcze pocztą.
 * Wyliczenie ich w edytorze obiecywałoby ustawienie, które nic nie robi.
 */
export const EDITABLE_NOTIFICATION_TYPES = [
  "INVOICE_ISSUED",
  "PAYMENT_REMINDER",
  "PAYMENT_OVERDUE",
] as const satisfies readonly NotificationType[];

export type EditableNotificationType = (typeof EDITABLE_NOTIFICATION_TYPES)[number];

export function isEditableType(type: string): type is EditableNotificationType {
  return (EDITABLE_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export const NOTIFICATION_TYPE_LABELS: Record<EditableNotificationType, string> = {
  INVOICE_ISSUED: "Wystawiono dokument",
  PAYMENT_REMINDER: "Przypomnienie przed terminem",
  PAYMENT_OVERDUE: "Wezwanie po terminie",
};

export const NOTIFICATION_TYPE_HINTS: Record<EditableNotificationType, string> = {
  INVOICE_ISSUED:
    "Wychodzi raz, gdy rachunek zostanie wystawiony. Dokument PDF jedzie w załączniku.",
  PAYMENT_REMINDER: "Wychodzi raz, na kilka dni przed terminem płatności.",
  PAYMENT_OVERDUE:
    "Wychodzi po terminie i jest ponawiane, dopóki wpłata nie zostanie odnotowana.",
};

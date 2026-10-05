/**
 * Zdarzenia dostawy, jakie zwraca Resend w `last_event`.
 *
 * Osobny plik bez zależności, bo statusy czyta też przeglądarka — import
 * z `delivery.ts` wciągnąłby do paczki klienta SDK Resend i nodemailera.
 */
export const DELIVERY_EVENTS = [
  "queued",
  "scheduled",
  "sent",
  "delivered",
  "delivery_delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
  "suppressed",
  "canceled",
] as const;

export type DeliveryEvent = (typeof DELIVERY_EVENTS)[number];

export function isDeliveryEvent(value: unknown): value is DeliveryEvent {
  return typeof value === "string" && (DELIVERY_EVENTS as readonly string[]).includes(value);
}

import type { NotificationStatus } from "@/generated/prisma/enums";
import { isDeliveryEvent, type DeliveryEvent } from "@/lib/email/events";

/**
 * Status wiadomości w zakładce „Wiadomości" — ten sam słownik, co w Resend.
 *
 * Nasz wpis zna tylko „wysłano" albo „nie wysłano". Jeśli Resend powiedział
 * coś więcej (doręczona, odbita), to wygrywa jego wersja, bo jest późniejsza.
 */
export type MessageStatus = DeliveryEvent;

export function resolveMessageStatus(row: {
  status: NotificationStatus;
  deliveryEvent: string | null;
}): MessageStatus {
  if (row.status === "FAILED") return "failed";
  if (row.status === "PENDING") return "queued";
  return isDeliveryEvent(row.deliveryEvent) ? row.deliveryEvent : "sent";
}

export const MESSAGE_STATUS_TONE: Record<
  MessageStatus,
  "neutral" | "good" | "warning" | "critical" | "accent"
> = {
  queued: "neutral",
  scheduled: "neutral",
  sent: "accent",
  delivered: "good",
  opened: "good",
  clicked: "good",
  delivery_delayed: "warning",
  complained: "warning",
  bounced: "critical",
  failed: "critical",
  suppressed: "critical",
  canceled: "neutral",
};

/** Grupy filtra statusu: co dotarło, co jeszcze w drodze, co się nie udało. */
export const MESSAGE_STATUS_FILTERS = ["all", "delivered", "sent", "failed"] as const;
export type MessageStatusFilter = (typeof MESSAGE_STATUS_FILTERS)[number];

export const DELIVERED_EVENTS: DeliveryEvent[] = ["delivered", "opened", "clicked"];
export const IN_TRANSIT_EVENTS: DeliveryEvent[] = [
  "queued",
  "scheduled",
  "sent",
  "delivery_delayed",
];
export const PROBLEM_EVENTS: DeliveryEvent[] = [
  "bounced",
  "complained",
  "failed",
  "suppressed",
  "canceled",
];

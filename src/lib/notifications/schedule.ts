import type { NotificationType } from "@/generated/prisma/enums";
import { daysOverdue, DUE_SOON_DAYS } from "@/lib/invoices/status";

/**
 * Decyzja, które powiadomienie należy się dokumentowi na dziś.
 *
 * Czysta funkcja, bez bazy i bez bramki e-mail — to tutaj mieszka reguła,
 * którą trzeba umieć sprawdzić testem: kiedy przypomnieć, kiedy ponowić
 * wezwanie i kiedy nie pisać wcale.
 */

/** Co ile dni ponawiamy wezwanie do zapłaty po terminie. */
export const OVERDUE_REPEAT_DAYS = 7;

/** Jak długo po wystawieniu ma sens wysyłać zawiadomienie o dokumencie. */
export const ISSUED_NOTICE_MAX_AGE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export type NotificationCandidate = {
  issueDate: Date;
  dueDate: Date;
  /** Data ostatniej *udanej* wysyłki każdego rodzaju powiadomienia. */
  sentTypes: Map<NotificationType, Date>;
};

/**
 * Zwraca `null`, gdy nic nie trzeba wysyłać.
 *
 * Rodzaje konkurują ze sobą, bo najemca ma dostać jedną wiadomość, a nie trzy:
 * pierwszeństwo ma zaległość, potem zbliżający się termin, na końcu samo
 * zawiadomienie o wystawieniu.
 */
export function chooseNotification(
  invoice: NotificationCandidate,
  now: Date,
): NotificationType | null {
  const overdueDays = daysOverdue(invoice.dueDate, now);

  if (overdueDays > 0) {
    const lastSent = invoice.sentTypes.get("PAYMENT_OVERDUE");
    // Wezwanie ponawiamy co tydzień: codzienna wiadomość o tej samej zaległości
    // trafia do spamu i przestaje działać.
    if (!lastSent) return "PAYMENT_OVERDUE";
    return now.getTime() - lastSent.getTime() >= OVERDUE_REPEAT_DAYS * DAY_MS
      ? "PAYMENT_OVERDUE"
      : null;
  }

  if (overdueDays > -DUE_SOON_DAYS && !invoice.sentTypes.has("PAYMENT_REMINDER")) {
    return "PAYMENT_REMINDER";
  }

  const issuedAgeDays = Math.round((now.getTime() - invoice.issueDate.getTime()) / DAY_MS);
  if (issuedAgeDays <= ISSUED_NOTICE_MAX_AGE_DAYS && !invoice.sentTypes.has("INVOICE_ISSUED")) {
    return "INVOICE_ISSUED";
  }

  return null;
}

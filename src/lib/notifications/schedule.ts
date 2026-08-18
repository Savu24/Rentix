import type { NotificationType } from "@/generated/prisma/enums";
import { daysOverdue, DUE_SOON_DAYS } from "@/lib/invoices/status";

/**
 * Decyzja, które powiadomienie należy się dokumentowi na dziś.
 *
 * Czysta funkcja, bez bazy i bez bramki e-mail — to tutaj mieszka reguła,
 * którą trzeba umieć sprawdzić testem: kiedy przypomnieć, kiedy ponowić
 * wezwanie i kiedy nie pisać wcale.
 */

/** Co ile dni ponawiamy wezwanie do zapłaty po terminie, gdy konto nie ustawiło własnego rytmu. */
export const OVERDUE_REPEAT_DAYS = 7;

/** Jak długo po wystawieniu ma sens wysyłać zawiadomienie o dokumencie. */
export const ISSUED_NOTICE_MAX_AGE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rytm przypominania, ustawiany per organizacja.
 *
 * Do niedawna obie liczby były stałymi w tym pliku. Rozbiły się o rzeczywistość:
 * najem krótkoterminowy chce przypomnienia na dzień przed terminem, a długi
 * najem firmowy na tydzień — jeden rytm dla wszystkich kont oznaczał, że
 * połowa z nich pisze do najemców w złym momencie.
 */
export type NotificationSchedule = {
  reminderDaysBefore: number;
  overdueRepeatDays: number;
};

export const DEFAULT_SCHEDULE: NotificationSchedule = {
  reminderDaysBefore: DUE_SOON_DAYS,
  overdueRepeatDays: OVERDUE_REPEAT_DAYS,
};

export type NotificationCandidate = {
  issueDate: Date;
  dueDate: Date;
  /** Data ostatniej *udanej* wysyłki każdego rodzaju powiadomienia. */
  sentTypes: Map<NotificationType, Date>;
};

/**
 * Rodzaje, które wynajmujący zostawił włączone. Brak zbioru = wszystkie.
 *
 * Wyłączenie jest twarde: jeśli konto nie chce wezwań po terminie, dokument po
 * terminie nie dostaje *żadnej* wiadomości. Podmiana na łagodniejsze
 * przypomnienie byłaby obejściem decyzji, którą ktoś świadomie podjął.
 */
export type EnabledTypes = ReadonlySet<NotificationType> | null;

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
  schedule: NotificationSchedule = DEFAULT_SCHEDULE,
  enabled: EnabledTypes = null,
): NotificationType | null {
  const allows = (type: NotificationType) => !enabled || enabled.has(type);
  const overdueDays = daysOverdue(invoice.dueDate, now);

  if (overdueDays > 0) {
    if (!allows("PAYMENT_OVERDUE")) return null;

    const lastSent = invoice.sentTypes.get("PAYMENT_OVERDUE");
    // Wezwanie ponawiamy co kilka dni: codzienna wiadomość o tej samej
    // zaległości trafia do spamu i przestaje działać.
    if (!lastSent) return "PAYMENT_OVERDUE";
    return now.getTime() - lastSent.getTime() >= schedule.overdueRepeatDays * DAY_MS
      ? "PAYMENT_OVERDUE"
      : null;
  }

  if (
    allows("PAYMENT_REMINDER") &&
    overdueDays > -schedule.reminderDaysBefore &&
    !invoice.sentTypes.has("PAYMENT_REMINDER")
  ) {
    return "PAYMENT_REMINDER";
  }

  // Wyłączone przypomnienie przed terminem nie blokuje zawiadomienia
  // o wystawieniu: to dwie różne wiadomości, a nie dwa natężenia tej samej.
  const issuedAgeDays = Math.round((now.getTime() - invoice.issueDate.getTime()) / DAY_MS);
  if (
    allows("INVOICE_ISSUED") &&
    issuedAgeDays <= ISSUED_NOTICE_MAX_AGE_DAYS &&
    !invoice.sentTypes.has("INVOICE_ISSUED")
  ) {
    return "INVOICE_ISSUED";
  }

  return null;
}

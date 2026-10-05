import { resendClient } from "./client";
import { isDeliveryEvent, type DeliveryEvent } from "./events";

/**
 * Status dostawy wiadomości u Resend.
 *
 * Nasz wpis wie tylko, czy Resend przyjął wiadomość. Co stało się dalej —
 * doręczona, odbita przez serwer odbiorcy, oznaczona jako spam — wie już
 * tylko Resend, więc o to pytamy, a odpowiedź odkładamy przy wpisie.
 *
 * Każde zapytanie jest „najlepszym wysiłkiem": brak klucza, limit zapytań
 * czy awaria po stronie Resend kończą się pustym wynikiem, a panel pokazuje
 * ostatni znany status. Zakładka z historią nie może paść dlatego, że
 * zewnętrzna usługa akurat nie odpowiada.
 */

/**
 * Identyfikatory Resend to UUID. SMTP zwraca Message-ID w nawiasach
 * kątowych — o taki nie ma sensu pytać Resend, bo go nie zna.
 */
const RESEND_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isResendId(id: string | null | undefined): id is string {
  return !!id && RESEND_ID.test(id);
}

/** Wiadomość z listy Resend — tyle, ile potrzeba do dopasowania wpisu. */
export type RemoteEmail = {
  id: string;
  to: string[];
  subject: string;
  createdAt: Date;
  event: DeliveryEvent | null;
};

/*
  Lista ostatnich wysyłek jest wspólna dla całej platformy, więc trzymamy ją
  chwilę w pamięci procesu: kilka osób otwierających zakładkę w tej samej
  minucie robi jedno zapytanie, a nie kilka — Resend liczy limit na konto.
*/
const LIST_TTL_MS = 60_000;

const globalForDelivery = globalThis as unknown as {
  recentEmails?: { fetchedAt: number; emails: RemoteEmail[] };
};

const REQUEST_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), REQUEST_TIMEOUT_MS)),
  ]);
}

/** Ostatnie wysyłki z Resend (do stu), albo pusta lista, gdy nie da się zapytać. */
export async function recentRemoteEmails(): Promise<RemoteEmail[]> {
  const resend = resendClient();
  if (!resend) return [];

  const cached = globalForDelivery.recentEmails;
  if (cached && Date.now() - cached.fetchedAt < LIST_TTL_MS) return cached.emails;

  try {
    const response = await withTimeout(resend.emails.list({ limit: 100 }));
    if (!response || response.error || !response.data) return cached?.emails ?? [];

    const emails = response.data.data.map((email) => ({
      id: email.id,
      to: email.to,
      subject: email.subject,
      createdAt: new Date(email.created_at),
      event: isDeliveryEvent(email.last_event) ? email.last_event : null,
    }));

    globalForDelivery.recentEmails = { fetchedAt: Date.now(), emails };
    return emails;
  } catch {
    return cached?.emails ?? [];
  }
}

/** Jedna wiadomość z Resend: status i treść, gdy wpis nie ma własnej kopii. */
export async function remoteEmail(
  id: string,
): Promise<{ event: DeliveryEvent | null; html: string | null; text: string | null } | null> {
  const resend = resendClient();
  if (!resend || !isResendId(id)) return null;

  try {
    const response = await withTimeout(resend.emails.get(id));
    if (!response || response.error || !response.data) return null;

    return {
      event: isDeliveryEvent(response.data.last_event) ? response.data.last_event : null,
      html: response.data.html,
      text: response.data.text,
    };
  } catch {
    return null;
  }
}

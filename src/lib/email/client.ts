import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Wysyłka e-maili przez Resend.
 *
 * Klient powstaje leniwie i jest cache'owany na `globalThis` — hot reload
 * w trybie deweloperskim inaczej tworzyłby nowe połączenie przy każdej zmianie
 * pliku, tak samo jak robi to klient Prismy.
 */

const globalForResend = globalThis as unknown as { resend?: Resend };

function client(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  globalForResend.resend ??= new Resend(env.RESEND_API_KEY);
  return globalForResend.resend;
}

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

/** Treść wiadomości bez adresata — tyle zwracają szablony. */
export type EmailContent = {
  subject: string;
  html: string;
  /** Wersja tekstowa — filtry antyspamowe traktują e-mail bez niej gorzej. */
  text: string;
};

export type EmailMessage = EmailContent & { to: string };

/**
 * Wysyła wiadomość i zwraca wynik zamiast rzucać wyjątkiem.
 *
 * Wołający zapisuje rezultat w `Notification`, więc nieudana wysyłka ma zostać
 * odnotowana, a nie wywrócić całą pętlę przypomnień — jeden zły adres nie może
 * zablokować powiadomień dla pozostałych najemców.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const resend = client();

  if (!resend) {
    // Bez klucza nie udajemy sukcesu: przypomnienie zostaje zapisane jako
    // nieudane i pójdzie przy następnym przebiegu, gdy klucz się pojawi.
    return { ok: false, error: "Brak RESEND_API_KEY — e-mail nie został wysłany." };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nieznany błąd wysyłki" };
  }
}

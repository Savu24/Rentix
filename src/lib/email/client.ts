import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "@/lib/env";

import { formatFrom } from "./sender";

/**
 * Wysyłka e-maili — dwie drogi za jednym interfejsem.
 *
 * - **Resend**, gdy ustawiony jest `RESEND_API_KEY`. Wymaga zweryfikowanej
 *   domeny nadawcy, za to daje najlepszą dostarczalność i podgląd wysyłek.
 * - **SMTP**, gdy ustawiony jest `SMTP_HOST`. Tu podłączysz cokolwiek: własną
 *   skrzynkę na Gmailu, pocztę hostingu albo darmowy plan Brevo. Skrzynka,
 *   którą już masz, nie wymaga konfigurowania rekordów DNS — wysyłasz
 *   z własnego adresu, więc nikt nie musi potwierdzać, że wolno ci to robić.
 *
 * Sam wymóg potwierdzenia nadawcy nie jest kaprysem dostawcy: bez SPF i DKIM
 * wiadomość ląduje w spamie, więc obejście go polega na użyciu adresu, który
 * takie wpisy już ma — a nie na ich pominięciu.
 *
 * Gdy skonfigurowane są obie drogi, wygrywa Resend: jest wybrany świadomie,
 * a SMTP bywa zostawiony po testach.
 */

const globalForMail = globalThis as unknown as {
  resend?: Resend;
  smtp?: nodemailer.Transporter;
};

function resendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  globalForMail.resend ??= new Resend(env.RESEND_API_KEY);
  return globalForMail.resend;
}

function smtpTransport(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;

  globalForMail.smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Port 465 to TLS od pierwszego bajtu; 587 zaczyna jawnie i podnosi
    // szyfrowanie STARTTLS-em. Pomyłka tutaj kończy się zawieszeniem
    // połączenia, a nie czytelnym błędem.
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  return globalForMail.smtp;
}

/** Którą drogą pójdzie wysyłka — do diagnostyki i komunikatów. */
export function mailTransport(): "resend" | "smtp" | null {
  if (resendClient()) return "resend";
  if (smtpTransport()) return "smtp";
  return null;
}

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

/** Treść wiadomości bez adresata — tyle zwracają szablony. */
export type EmailContent = {
  subject: string;
  html: string;
  /** Wersja tekstowa — filtry antyspamowe traktują e-mail bez niej gorzej. */
  text: string;
};

export type EmailMessage = EmailContent & {
  to: string;
  /**
   * Nazwa wynajmującego w polu nadawcy. Adres pozostaje adresem platformy —
   * tylko jej domena ma rekordy SPF i DKIM. Patrz `sender.ts`.
   */
  fromName?: string | null;
  /** Adres kontaktowy wynajmującego; tam trafi odpowiedź najemcy. */
  replyTo?: string | null;
  /** Dokumenty dołączone do wiadomości — najemca dostaje PDF, nie link. */
  attachments?: EmailAttachment[];
};

/**
 * Wysyła wiadomość i zwraca wynik zamiast rzucać wyjątkiem.
 *
 * Wołający zapisuje rezultat w `Notification`, więc nieudana wysyłka ma zostać
 * odnotowana, a nie wywrócić całą pętlę przypomnień — jeden zły adres nie może
 * zablokować powiadomień dla pozostałych najemców.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const from = formatFrom(env.EMAIL_FROM, message.fromName);
  const replyTo = message.replyTo?.trim() || undefined;

  const resend = resendClient();

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        ...(replyTo ? { replyTo } : {}),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((file) => ({
                filename: file.filename,
                content: file.content,
              })),
            }
          : {}),
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unknown delivery error" };
    }
  }

  const smtp = smtpTransport();

  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from,
        ...(replyTo ? { replyTo } : {}),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
        })),
      });

      return { ok: true, id: info.messageId ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Unknown SMTP error" };
    }
  }

  // Bez żadnej drogi nie udajemy sukcesu: przypomnienie zostaje zapisane jako
  // nieudane i pójdzie przy następnym przebiegu, gdy poczta zostanie podpięta.
  return {
    ok: false,
    error: "Poczta nie jest skonfigurowana. Ustaw RESEND_API_KEY albo dane SMTP.",
  };
}

import { env } from "@/lib/env";

import type { EmailMessage, SendEmailResult } from "./client";
import { formatFrom } from "./sender";

/**
 * Kopia wysłanej wiadomości do wpisu w `notifications`.
 *
 * Zakładka „Wiadomości" pokazuje e-mail tak, jak poszedł — z nadawcą, adresem
 * odpowiedzi i HTML-em z chwili wysyłki. Odtwarzanie go później z szablonu
 * pokazywałoby dzisiejszą treść zamiast tej, którą najemca dostał.
 *
 * Załączników nie kopiujemy, tylko ich nazwy: PDF da się wygenerować ponownie
 * z dokumentu, a trzymanie go w bazie przy każdym przypomnieniu puchłoby
 * szybciej niż cała reszta tabeli.
 */
export function emailCopy(message: EmailMessage, result: SendEmailResult) {
  return {
    fromAddress: formatFrom(env.EMAIL_FROM, message.fromName),
    replyTo: message.replyTo?.trim() || null,
    html: message.html,
    attachmentNames: message.attachments?.map((file) => file.filename) ?? [],
    providerId: result.ok ? result.id : null,
  };
}

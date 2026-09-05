import type { NextRequest } from "next/server";
import { fill } from "@/lib/i18n/format";
import { z } from "zod";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { mailTransport } from "@/lib/email/client";
import { sendTestEmail } from "@/lib/notifications/service";
import { EDITABLE_NOTIFICATION_TYPES } from "@/lib/notifications/types";

export const runtime = "nodejs";

const testSendSchema = z.object({ type: z.enum(EDITABLE_NOTIFICATION_TYPES) });

/**
 * Wysyła próbkę wiadomości na adres zalogowanego wynajmującego.
 *
 * Zawsze na własny adres z sesji, nigdy na adres z żądania: pole „wyślij test
 * na…" zamieniłoby panel w otwartą bramkę do wysyłania poczty na dowolny adres
 * z cudzą nazwą w polu nadawcy.
 *
 * Wysyłamy **zapisany** szablon, nie treść z formularza. Test ma odpowiadać na
 * pytanie „co dostanie najemca", a nie „co widzę teraz na ekranie" — od tego
 * drugiego jest podgląd na żywo obok pola.
 */

/** POST /api/notifications/test */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  if (!mailTransport()) {
    return apiError(
      "VALIDATION_ERROR",
      "Poczta nie jest jeszcze skonfigurowana. Brakuje klucza Resend albo danych SMTP.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await sendTestEmail(
    auth.organizationId,
    parsed.data.type,
    auth.session.user.email ?? null,
  );

  if (!result.ok) {
    if (result.reason === "NO_RECIPIENT") {
      return apiError("VALIDATION_ERROR", auth.d.panel.api.noAccountEmail);
    }
    return apiError("INTERNAL_ERROR", fill(auth.d.panel.api.sendFailed, { error: result.error }));
  }

  return ok({ toEmail: result.toEmail });
}

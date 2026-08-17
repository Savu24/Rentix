import type { NextRequest } from "next/server";

import { apiError, ok, rateLimited, validationError } from "@/lib/api/response";
import { getApiSession } from "@/lib/auth/session";
import { changePassword } from "@/lib/organizations/service";
import { consume, LIMITS, reset } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * POST /api/me/password — zmiana hasła po potwierdzeniu obecnego.
 *
 * Limit prób mimo aktywnej sesji: bez niego przejęty, niezablokowany komputer
 * pozwalałby zgadywać obecne hasło w nieskończoność, a to ono jest tu jedyną
 * barierą przed przejęciem konta na stałe.
 */
export async function POST(request: NextRequest) {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  const userId = result.session.user.id;
  const rateKey = `password-change:${userId}`;

  const rate = await consume(rateKey, LIMITS.passwordChange);
  if (!rate.success) return rateLimited(rate.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const changed = await changePassword(userId, parsed.data);

  if (changed.ok) {
    // Licznik kasujemy po udanej zmianie — kolejne wejście do ustawień nie ma
    // dziedziczyć limitu po nieudanych próbach sprzed chwili.
    await reset(rateKey);
    return ok({ changed: true });
  }

  switch (changed.reason) {
    case "USER_NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono konta.");
    case "NO_PASSWORD_SET":
      return apiError(
        "CONFLICT",
        "To konto loguje się przez zewnętrznego dostawcę i nie ma hasła do zmiany.",
      );
    case "WRONG_PASSWORD":
      return apiError("VALIDATION_ERROR", "Popraw zaznaczone pola.", {
        fields: { currentPassword: ["Nieprawidłowe hasło"] },
      });
  }
}

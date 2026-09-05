import type { NextRequest } from "next/server";

import { apiError, created, rateLimited, validationError } from "@/lib/api/response";
import { registerOwner } from "@/lib/auth/register";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { clientIp, consume, LIMITS } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 *
 * Zakłada konto właściciela wraz z organizacją.
 * Czysty REST — ten sam endpoint obsłuży w przyszłości aplikację mobilną.
 *
 * Body:  { name, organizationName, email, password }
 * 201 →  { id, email, name }
 * 422 →  { error: { code: "VALIDATION_ERROR", fields: {...} } }
 * 409 →  { error: { code: "CONFLICT" } }
 * 429 →  { error: { code: "RATE_LIMITED" } }
 */
export async function POST(request: NextRequest) {
  const rate = await consume(`register:${clientIp(request.headers)}`, LIMITS.register);
  if (!rate.success) return rateLimited(rate.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  /*
    Wersję krajową podaje formularz — to ta strona, którą użytkownik naprawdę
    miał przed sobą. Nierozpoznana wartość (żądanie spoza formularza, klient
    mobilny) schodzi do domyślnej zamiast wywracać rejestrację.
  */
  const locale =
    typeof body === "object" && body !== null && "locale" in body && isLocale(body.locale)
      ? body.locale
      : DEFAULT_LOCALE;

  const d = getDictionary(locale).auth;

  const parsed = registerSchema(d.validation).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await registerOwner(parsed.data, locale);

  if (!result.ok) {
    return apiError("CONFLICT", d.register.emailTaken, {
      fields: { email: [d.register.emailTakenField] },
    });
  }

  // Świadomie nie logujemy użytkownika automatycznie — sesję zakłada dopiero
  // NextAuth po stronie klienta, żeby ciasteczko powstało tą samą ścieżką
  // co przy zwykłym logowaniu.
  return created(result.user);
}

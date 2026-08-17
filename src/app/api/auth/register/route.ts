import type { NextRequest } from "next/server";

import { apiError, created, rateLimited, validationError } from "@/lib/api/response";
import { registerOwner } from "@/lib/auth/register";
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await registerOwner(parsed.data);

  if (!result.ok) {
    return apiError("CONFLICT", "Konto z tym adresem e-mail już istnieje.", {
      fields: { email: ["Ten adres jest już zajęty"] },
    });
  }

  // Świadomie nie logujemy użytkownika automatycznie — sesję zakłada dopiero
  // NextAuth po stronie klienta, żeby ciasteczko powstało tą samą ścieżką
  // co przy zwykłym logowaniu.
  return created(result.user);
}

import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, ok, validationError } from "@/lib/api/response";
import { getApiSession, sessionLocaleContext, setActiveOrganization } from "@/lib/auth/session";

export const runtime = "nodejs";

const switchSchema = z.object({ organizationId: z.string().min(1) });

/**
 * PUT /api/organization/active — przełączenie na inną organizację.
 *
 * PUT, nie POST: konto ma jedną bieżącą organizację, więc to podmiana wartości
 * pod znanym adresem, a nie tworzenie zasobu. Powtórzone żądanie daje ten sam
 * stan.
 *
 * Wybór ląduje w bazie, nie w tokenie sesji — token żyje trzydzieści dni
 * i odświeża się najwyżej raz na dobę, więc przełączenie zapisane w nim
 * działałoby z opóźnieniem i osobno na każdym urządzeniu.
 *
 * Członkostwo sprawdza `setActiveOrganization`: identyfikator przychodzi
 * z przeglądarki, więc nie wolno go zapisać na słowo.
 */
export async function PUT(request: NextRequest) {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  const context = await sessionLocaleContext(result.session);
  const t = context.d.panel.api;

  if (result.session.user.role === "TENANT") {
    return apiError("FORBIDDEN", t.ownerOnly);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", t.invalidJson);
  }

  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const switched = await setActiveOrganization(
    result.session.user.id,
    parsed.data.organizationId,
  );

  // Brak członkostwa to „nie znaleziono", a nie „brak uprawnień": odpowiedź
  // nie ma potwierdzać, że taka organizacja w ogóle istnieje.
  if (!switched) return apiError("NOT_FOUND", t.notFound.organization);

  return ok({ organizationId: parsed.data.organizationId });
}

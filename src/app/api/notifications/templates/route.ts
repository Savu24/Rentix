import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiFeature, requireApiOwner } from "@/lib/auth/session";
import { saveEmailTemplate, setTemplateEnabled } from "@/lib/notifications/service";
import { EDITABLE_NOTIFICATION_TYPES } from "@/lib/notifications/types";
import { emailTemplateSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Treść jednego rodzaju powiadomienia.
 *
 * PUT, nie POST: rodzaj powiadomienia jest kluczem, więc zapis jest
 * podmianą zawartości pod znanym adresem, a nie tworzeniem kolejnego zasobu.
 * Powtórzone żądanie daje ten sam stan — po dwukrotnym kliknięciu „Zapisz"
 * nie robi się drugi szablon.
 *
 * Własne teksty wchodzą z planem Pro. Przełącznik automatycznej wysyłki
 * (PATCH niżej) nie — to rytm przypominania, a ten ma każde konto.
 */

/** PUT /api/notifications/templates */
export async function PUT(request: NextRequest) {
  const auth = await requireApiFeature("MESSAGE_TEMPLATES");
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = emailTemplateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await saveEmailTemplate(auth.organizationId, parsed.data));
}

const toggleSchema = z.object({
  type: z.enum(EDITABLE_NOTIFICATION_TYPES),
  enabled: z.boolean(),
});

/**
 * PATCH /api/notifications/templates — sam przełącznik automatycznej wysyłki.
 *
 * Nie da się tego zrobić przez PUT: tamten zapisuje cały wiersz, więc
 * przestawienie przełącznika w jednej zakładce nadpisałoby teksty wpisane
 * w drugiej wartościami, które formularz wczytał przy wejściu na stronę.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(
    await setTemplateEnabled(auth.organizationId, parsed.data.type, parsed.data.enabled),
  );
}

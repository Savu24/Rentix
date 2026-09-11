import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { updateNumberingSettings } from "@/lib/organizations/service";
import { numberingSettingsSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Wzór numeru dokumentu — organizacja bieżącej sesji.
 *
 * Osobna trasa, a nie pole w `PATCH /api/organization`: dane wystawcy
 * i numeracja to dwa formularze w panelu i zapis jednego nie ma nadpisywać
 * drugiego tym, co akurat było w polach. Organizacja bierze się z sesji,
 * patrz komentarz w `/api/organization`.
 */

/** PATCH /api/organization/numbering */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = numberingSettingsSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await updateNumberingSettings(auth.organizationId, parsed.data));
}

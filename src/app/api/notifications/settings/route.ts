import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import {
  getNotificationPanelData,
  updateNotificationSettings,
} from "@/lib/notifications/service";
import { notificationSettingsSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Rytm przypominania i nazwa nadawcy powiadomień.
 *
 * Ścieżka bez identyfikatora organizacji — bierze się on z sesji, tak jak
 * w `/api/organization`. Patrz komentarz tamże.
 */

/** GET /api/notifications/settings */
export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const data = await getNotificationPanelData(auth.organizationId);
  if (!data) return apiError("NOT_FOUND", "Nie znaleziono organizacji.");

  return ok(data);
}

/** PATCH /api/notifications/settings */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await updateNotificationSettings(auth.organizationId, parsed.data));
}

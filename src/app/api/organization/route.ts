import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { getOrganization, isSellerComplete, updateOrganization } from "@/lib/organizations/service";
import { organizationSettingsSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Dane wystawcy dokumentów — organizacja bieżącej sesji.
 *
 * Ścieżka bez identyfikatora, bo organizacja bierze się z tokenu, nigdy z URL-a.
 * Podanie jej w adresie zapraszałoby do podmiany cudzego identyfikatora.
 */

/** GET /api/organization */
export async function GET() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const organization = await getOrganization(auth.organizationId);
  if (!organization) return apiError("NOT_FOUND", "Nie znaleziono organizacji.");

  return ok({ ...organization, sellerComplete: isSellerComplete(organization) });
}

/** PATCH /api/organization */
export async function PATCH(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = organizationSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const organization = await updateOrganization(auth.organizationId, parsed.data);
  return ok({ ...organization, sellerComplete: isSellerComplete(organization) });
}

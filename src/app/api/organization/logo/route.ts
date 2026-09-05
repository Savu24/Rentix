import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { deleteOrganizationLogo, saveOrganizationLogo } from "@/lib/organizations/service";
import { organizationLogoSchema } from "@/lib/validations/settings";

export const runtime = "nodejs";

/**
 * Logo wystawcy drukowane na dokumentach.
 *
 * Obrazek przychodzi jako data URI w JSON-ie, a nie jako multipart: jest jeden
 * na organizację i ląduje w bazie, więc cała reszta panelu może korzystać
 * z tego samego klienta REST, bez osobnej ścieżki na pliki.
 */

/** PUT /api/organization/logo — wgranie podmienia poprzednie. */
export async function PUT(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = organizationLogoSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return ok(await saveOrganizationLogo(auth.organizationId, parsed.data.dataUrl));
}

/** DELETE /api/organization/logo — dokument wraca do wersji bez logo. */
export async function DELETE() {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const removed = await deleteOrganizationLogo(auth.organizationId);
  return ok({ removed });
}

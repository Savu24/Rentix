import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import {
  archiveProperty,
  deleteProperty,
  getProperty,
  updateProperty,
} from "@/lib/properties/service";
import { propertyUpdateSchema } from "@/lib/validations/property";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/properties/:id — szczegóły z jednostkami i aktywnymi umowami. */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const property = await getProperty(auth.organizationId, id);

  // Cudze id daje 404, a nie 403 — inaczej odpowiedź potwierdzałaby,
  // że taki rekord istnieje u kogoś innego.
  if (!property) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);

  return ok(property);
}

/** PATCH /api/properties/:id — aktualizuje tylko przesłane pola. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = propertyUpdateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const updated = await updateProperty(auth.organizationId, id, parsed.data);

  if (!updated) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  return ok(updated);
}

/**
 * DELETE /api/properties/:id
 *
 * Domyślnie archiwizuje. `?force=true` kasuje trwale, ale tylko gdy z obiektem
 * nigdy nie była związana umowa — inaczej zniknęłaby historia rozliczeń.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const archived = await archiveProperty(auth.organizationId, id);
    if (!archived) return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
    return ok({ id, archived: true });
  }

  const result = await deleteProperty(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") {
    return apiError("NOT_FOUND", auth.d.panel.api.notFound.property);
  }

  return apiError(
    "CONFLICT",
    `Nie można usunąć. Z nieruchomością powiązano ${result.leaseCount} ${
      result.leaseCount === 1 ? "umowę" : "umów"
    }. Zarchiwizuj ją zamiast usuwać.`,
  );
}

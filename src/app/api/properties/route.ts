import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createProperty, listProperties } from "@/lib/properties/service";
import { propertyCreateSchema, propertyListQuerySchema } from "@/lib/validations/property";

export const runtime = "nodejs";

/**
 * GET /api/properties?q=&type=&occupancy=&includeArchived=
 *
 * Lista nieruchomości organizacji z licznikami jednostek.
 * 200 → PropertyListItem[]
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = propertyListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listProperties(auth.organizationId, parsed.data));
}

/**
 * POST /api/properties
 *
 * Zakłada nieruchomość razem z pokojami — `roomCount` decyduje, ile ich
 * powstanie. Ceny użytkownik wpisuje w kolejnym kroku.
 *
 * 201 → { id, name, _count: { rooms } }
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = propertyCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return created(await createProperty(auth.organizationId, parsed.data));
}

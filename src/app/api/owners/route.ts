import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createOwner, listOwners } from "@/lib/owners/service";
import { ownerFormSchema, ownerListQuerySchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

/** GET /api/owners?q=&includeArchived= */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = ownerListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listOwners(auth.organizationId, parsed.data));
}

/**
 * POST /api/owners — 201 → { id, name }
 *
 * Woła to zarówno osobny formularz właściciela, jak i kreator nieruchomości,
 * w którym właściciela dodaje się bez opuszczania strony.
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

  const parsed = ownerFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return created(await createOwner(auth.organizationId, parsed.data));
}

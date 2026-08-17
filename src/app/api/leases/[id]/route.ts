import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { getLease, updateLease } from "@/lib/leases/service";
import { leaseUpdateSchema } from "@/lib/validations/lease";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const lease = await getLease(auth.organizationId, id);

  if (!lease) return apiError("NOT_FOUND", "Nie znaleziono umowy.");
  return ok(lease);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = leaseUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const updated = await updateLease(auth.organizationId, id, parsed.data);

  if (!updated) return apiError("NOT_FOUND", "Nie znaleziono umowy.");
  return ok(updated);
}

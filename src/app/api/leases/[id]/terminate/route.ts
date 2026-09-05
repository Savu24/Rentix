import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { terminateLease } from "@/lib/leases/service";
import { terminateLeaseSchema } from "@/lib/validations/lease";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/leases/:id/terminate
 *
 * Wypowiedzenie to operacja, nie zmiana pola: przestawia status umowy, zwalnia
 * jednostkę i przestawia najemców na „byłych" — wszystko w jednej transakcji.
 * Dlatego osobny endpoint zamiast PATCH-a na `status`.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = terminateLeaseSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const lease = await terminateLease(auth.organizationId, id, parsed.data);

  if (!lease) return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease);
  return ok({ id: lease.id, status: lease.status });
}

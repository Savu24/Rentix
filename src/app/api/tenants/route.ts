import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createTenant, listTenants } from "@/lib/tenants/service";
import { tenantFormSchema, tenantListQuerySchema } from "@/lib/validations/tenant";

export const runtime = "nodejs";

/** GET /api/tenants?q=&status=&overdue=&includeArchived= */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = tenantListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listTenants(auth.organizationId, parsed.data));
}

/** POST /api/tenants → 201 { id, firstName, lastName } */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = tenantFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  return created(await createTenant(auth.organizationId, parsed.data));
}

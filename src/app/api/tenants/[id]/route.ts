import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { archiveTenant, deleteTenant, getTenant, updateTenant } from "@/lib/tenants/service";
import { tenantUpdateSchema } from "@/lib/validations/tenant";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const tenant = await getTenant(auth.organizationId, id);

  if (!tenant) return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);
  return ok(tenant);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = tenantUpdateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const updated = await updateTenant(auth.organizationId, id, parsed.data);

  if (!updated) return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);
  return ok(updated);
}

/** DELETE — archiwizuje; `?force=true` kasuje najemcę bez żadnej umowy. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const archived = await archiveTenant(auth.organizationId, id);
    if (!archived) return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);
    return ok({ id, archived: true });
  }

  const result = await deleteTenant(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant);

  return apiError(
    "CONFLICT",
    `Nie można usunąć. Najemca figuruje na ${result.leaseCount} ${
      result.leaseCount === 1 ? "umowie" : "umowach"
    }. Zarchiwizuj go zamiast usuwać.`,
  );
}

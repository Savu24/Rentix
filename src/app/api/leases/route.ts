import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { leaseLimitMessage } from "@/lib/billing/message";
import { createLease, listLeases } from "@/lib/leases/service";
import { leaseFormSchema, leaseListQuerySchema } from "@/lib/validations/lease";

export const runtime = "nodejs";

/** GET /api/leases?q=&status=&propertyId=&expiringInDays= */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = leaseListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listLeases(auth.organizationId, parsed.data));
}

/**
 * POST /api/leases
 *
 * 201 → { id }
 * 404 → jednostka lub najemca spoza organizacji
 * 409 → jednostka ma już aktywną umowę
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = leaseFormSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await createLease(auth.organizationId, parsed.data);

  if (result.ok) return created(result.lease);

  switch (result.reason) {
    case "PROPERTY_NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.property, {
        fields: { propertyId: [auth.d.panel.api.fields.selectProperty] },
      });
    case "ROOM_NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.roomInProperty, {
        fields: { roomId: [auth.d.panel.api.fields.selectRoom] },
      });
    case "TENANT_NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.selectedTenant, {
        fields: { tenantIds: [auth.d.panel.api.fields.selectTenant] },
      });
    case "PROPERTY_OCCUPIED":
      return apiError(
        "CONFLICT",
        auth.d.panel.api.propertyOccupiedMessage,
        { fields: { propertyId: [auth.d.panel.api.fields.propertyOccupied] } },
      );
    case "ROOM_OCCUPIED":
      return apiError(
        "CONFLICT",
        auth.d.panel.api.roomOccupiedMessage,
        { fields: { roomId: [auth.d.panel.api.fields.roomOccupied] } },
      );
    case "LEASE_LIMIT":
      return apiError("CONFLICT", leaseLimitMessage(auth, result.plan, result.limit));
  }
}

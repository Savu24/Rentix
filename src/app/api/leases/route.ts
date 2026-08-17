import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
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
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = leaseFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await createLease(auth.organizationId, parsed.data);

  if (result.ok) return created(result.lease);

  switch (result.reason) {
    case "PROPERTY_NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono nieruchomości.", {
        fields: { propertyId: ["Wybierz nieruchomość z listy"] },
      });
    case "ROOM_NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono pokoju w tej nieruchomości.", {
        fields: { roomId: ["Wybierz pokój z listy"] },
      });
    case "TENANT_NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono wskazanego najemcy.", {
        fields: { tenantIds: ["Wybierz najemcę z listy"] },
      });
    case "PROPERTY_OCCUPIED":
      return apiError(
        "CONFLICT",
        "Ta nieruchomość ma już aktywną umowę. Zakończ poprzednią, wybierz konkretny pokój albo zapisz nową jako szkic.",
        { fields: { propertyId: ["Nieruchomość jest już wynajęta"] } },
      );
    case "ROOM_OCCUPIED":
      return apiError(
        "CONFLICT",
        "Ten pokój ma już aktywną umowę. Zakończ poprzednią albo wybierz inny pokój.",
        { fields: { roomId: ["Pokój jest już wynajęty"] } },
      );
  }
}

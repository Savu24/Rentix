import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { archiveLease, deleteLease, getLease, updateLease } from "@/lib/leases/service";
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

/**
 * DELETE /api/leases/:id — archiwizacja; `?force=true` usuwa trwale.
 *
 * Archiwizacja tylko chowa umowę z listy roboczej: faktury i wpłaty zostają,
 * bo to historia rozliczeń, a nie robocza notatka. Trwale znika wyłącznie
 * umowa, na którą nigdy nic nie wystawiono.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const archived = await archiveLease(auth.organizationId, id);

    if (archived.ok) return ok({ id, archived: true });
    if (archived.reason === "NOT_FOUND") return apiError("NOT_FOUND", "Nie znaleziono umowy.");

    return apiError(
      "CONFLICT",
      "Umowa jest aktywna. Zakończ ją najpierw — inaczej jednostka zostałaby zajęta przez umowę, której nie widać na liście.",
    );
  }

  const result = await deleteLease(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") return apiError("NOT_FOUND", "Nie znaleziono umowy.");

  return apiError(
    "CONFLICT",
    `Nie można usunąć — do umowy wystawiono ${result.invoiceCount} ${
      result.invoiceCount === 1 ? "dokument" : "dokumentów"
    }. Zostaw ją w archiwum, żeby historia rozliczeń została spójna.`,
  );
}

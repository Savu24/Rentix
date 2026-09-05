import type { NextRequest } from "next/server";
import { fill, pluralize } from "@/lib/i18n/format";

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

  if (!lease) return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease);
  return ok(lease);
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

  const parsed = leaseUpdateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const updated = await updateLease(auth.organizationId, id, parsed.data);

  if (!updated.ok) {
    if (updated.reason === "NOT_FOUND") return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease);

    return apiError(
      "CONFLICT",
      auth.d.panel.api.unitOccupied,
    );
  }

  return ok(updated.lease);
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
    if (archived.reason === "NOT_FOUND") return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease);

    return apiError(
      "CONFLICT",
      auth.d.panel.api.leaseStillActive,
    );
  }

  const result = await deleteLease(auth.organizationId, id);

  if (result.ok) return ok({ id, deleted: true });
  if (result.reason === "NOT_FOUND") return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease);

  return apiError(
    "CONFLICT",
    fill(auth.d.panel.api.leaseHasInvoices, {
      count: result.invoiceCount,
      noun: pluralize(auth.locale, result.invoiceCount, auth.d.panel.api.countable.documents),
    }),
  );
}

import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { refreshDraftFromLease } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/refresh — szkic przeliczony od nowa z aktualnej umowy.
 *
 * Na wypadek, gdy umowę zmieniono już po naliczeniu (przedłużenie, nowy
 * czynsz). Ręczne poprawki szkicu przepadają. Patrz `refreshDraftFromLease`.
 *
 * 409 → dokument nie jest już szkicem, nie ma umowy albo umowa nie obejmuje
 *       już tego miesiąca
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await refreshDraftFromLease(auth.organizationId, id);

  if (result.ok) return ok({ id });

  const t = auth.d.panel.api;
  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", t.notFound.invoice);
    case "NOT_DRAFT":
      return apiError("CONFLICT", t.invoiceNotDraft);
    case "NO_LEASE":
      return apiError("CONFLICT", t.draftRefreshNoLease);
    case "OUTSIDE_LEASE_PERIOD":
      return apiError("CONFLICT", t.draftRefreshOutsideLease);
    case "NOTHING_TO_BILL":
      return apiError("CONFLICT", t.draftRefreshNothingToBill);
    case "ALREADY_INVOICED":
      return apiError("CONFLICT", t.draftRefreshAlreadyInvoiced);
  }
}

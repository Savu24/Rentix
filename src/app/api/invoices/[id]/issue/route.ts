import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { issueDraftInvoice } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/issue — zatwierdzenie szkicu.
 *
 * Szkic dostaje numer z rejestru i staje się zwykłym wystawionym dokumentem:
 * od tej chwili widzi go najemca, idą do niego przypomnienia i da się
 * zapisać wpłatę. Patrz `src/lib/invoices/draft.ts`.
 *
 * 409 → dokument nie jest już szkicem albo nie ma nic do zapłaty
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await issueDraftInvoice(auth.organizationId, id);

  if (result.ok) return ok(result.invoice);

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NOT_DRAFT":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNotDraft);
    case "NOTHING_TO_BILL":
      return apiError("CONFLICT", auth.d.panel.api.draftNothingToBill);
  }
}

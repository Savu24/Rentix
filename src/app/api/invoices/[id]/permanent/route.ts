import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { deleteCancelledInvoice } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * DELETE /api/invoices/:id/permanent — trwałe usunięcie anulowanego dokumentu.
 *
 * Osobny adres, bo DELETE na samym dokumencie to anulowanie: jedno
 * powtórzone żądanie nie może z anulowania zrobić skasowania.
 *
 * 409 → dokument nie jest anulowany albo ma wpłaty
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await deleteCancelledInvoice(auth.organizationId, id);

  if (result.ok) return ok({ id });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NOT_CANCELLED":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNotCancelled);
    case "HAS_PAYMENTS":
      return apiError("CONFLICT", auth.d.panel.api.invoiceHasPayments);
  }
}

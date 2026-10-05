import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { restoreInvoice } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/restore — cofnięcie anulowania.
 *
 * Dokument wraca jako wystawiony (albo jako szkic, jeśli był szkicem).
 *
 * 409 → dokument nie jest anulowany albo za ten okres umowy jest już inny
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await restoreInvoice(auth.organizationId, id);

  if (result.ok) return ok({ id, status: result.status });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NOT_CANCELLED":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNotCancelled);
    case "PERIOD_TAKEN":
      return apiError("CONFLICT", auth.d.panel.api.invoicePeriodTaken);
  }
}

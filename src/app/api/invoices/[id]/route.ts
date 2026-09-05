import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { cancelInvoice, getInvoice } from "@/lib/invoices/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** GET /api/invoices/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const invoice = await getInvoice(auth.organizationId, id);

  if (!invoice) return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
  return ok(invoice);
}

/**
 * DELETE /api/invoices/:id — anulowanie dokumentu.
 *
 * Rekord zostaje w bazie ze statusem CANCELLED: numer musi pozostać zajęty,
 * bo dziura w rejestrze wygląda dla księgowego jak zaginiony dokument.
 *
 * 409 → dokument ma wpłaty; najpierw trzeba je usunąć
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await cancelInvoice(auth.organizationId, id);

  if (result.ok) return ok({ id, status: "CANCELLED" });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "ALREADY_CANCELLED":
      return apiError("CONFLICT", auth.d.panel.api.alreadyCancelled);
    case "HAS_PAYMENTS":
      return apiError(
        "CONFLICT",
        "Do dokumentu wpisano wpłaty. Usuń je najpierw, inaczej w kasie zostałyby pieniądze bez dokumentu.",
      );
  }
}

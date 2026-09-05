import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { deletePayment } from "@/lib/invoices/service";

export const runtime = "nodejs";

/**
 * DELETE /api/payments/:id — usunięcie błędnie wpisanej wpłaty.
 *
 * Saldo i status dokumentu są przeliczane z pozostałych wpłat w tej samej
 * transakcji, więc faktura wraca do stanu sprzed pomyłki.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const invoice = await deletePayment(auth.organizationId, id);

  if (!invoice) return apiError("NOT_FOUND", auth.d.panel.api.notFound.payment);

  return ok({ invoice });
}

import type { NextRequest } from "next/server";

import { apiError, ok } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { sendInvoiceToTenant } from "@/lib/notifications/send-invoice";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/send — wysyła dokument najemcy od razu.
 *
 * Nocny przebieg i tak rozsyła świeżo wystawione dokumenty, ale przy
 * dokumencie wystawionym ręcznie czekanie do rana bywa bez sensu. To ta sama
 * ścieżka wysyłki, więc wynik ląduje w `notifications` i przebieg cronowy
 * nie wyśle tego drugi raz.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const result = await sendInvoiceToTenant(auth.organizationId, id);

  if (result.ok) return ok({ sent: true, toEmail: result.toEmail });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NO_TENANT":
      return apiError(
        "CONFLICT",
        "Dokument nie ma wskazanego nabywcy ani umowy, więc nie wiadomo, komu go wysłać.",
      );
    case "NO_RECIPIENT":
      return apiError(
        "CONFLICT",
        "Najemca nie ma adresu e-mail. Uzupełnij go w kartotece, bo nie ma dokąd wysłać dokumentu.",
      );
    case "CANCELLED":
      return apiError("CONFLICT", auth.d.panel.api.cancelledNotSent);
    case "SEND_FAILED":
      return apiError("INTERNAL_ERROR", result.error);
  }
}

import type { NextRequest } from "next/server";

import { apiError, created, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { recordPayment } from "@/lib/invoices/service";
import { paymentFormSchema } from "@/lib/validations/invoice";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/payments — zapis wpłaty.
 *
 * Wpłata i przeliczenie salda dokumentu idą w jednej transakcji, więc nie ma
 * stanu, w którym pieniądze są zapisane, a status faktury tego nie odnotował.
 *
 * 201 → { payment: { id }, invoice: { status, paidGrosze } }
 * 409 → dokument anulowany
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Treść żądania musi być poprawnym JSON-em.");
  }

  const parsed = paymentFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await recordPayment(auth.organizationId, id, parsed.data);

  if (result.ok) return created({ payment: result.payment, invoice: result.invoice });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", "Nie znaleziono dokumentu.");
    case "CANCELLED":
      return apiError(
        "CONFLICT",
        "Dokument jest anulowany — wpłatę trzeba przypisać do innego dokumentu.",
      );
  }
}

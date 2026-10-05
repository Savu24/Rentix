import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { issueDraftInvoice } from "@/lib/invoices/service";
import { invoiceIssueSchema } from "@/lib/validations/invoice";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/issue — zatwierdzenie szkicu.
 *
 * Szkic dostaje numer z rejestru i staje się zwykłym wystawionym dokumentem:
 * od tej chwili widzi go najemca, idą do niego przypomnienia i da się
 * zapisać wpłatę. Patrz `src/lib/invoices/draft.ts`.
 *
 * Ciało `{ number }` (opcjonalne) — własny numer zamiast kolejnego z licznika,
 * na kontach z furtką z `renumber.ts`.
 *
 * 403 → własny numer na koncie bez tej furtki
 * 409 → dokument nie jest już szkicem, nie ma nic do zapłaty albo numer zajęty
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  // Puste ciało to zwykłe zatwierdzenie z numerem z licznika.
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim() !== "") body = JSON.parse(text);
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = invoiceIssueSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await issueDraftInvoice(auth.organizationId, id, parsed.data.number);

  if (result.ok) return ok(result.invoice);

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NOT_DRAFT":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNotDraft);
    case "NOTHING_TO_BILL":
      return apiError("CONFLICT", auth.d.panel.api.draftNothingToBill);
    case "NOT_ALLOWED":
      return apiError("FORBIDDEN", auth.d.panel.api.invoiceNumberNotAllowed);
    case "NUMBER_TAKEN":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNumberTaken, {
        fields: { number: [auth.d.panel.api.invoiceNumberTaken] },
      });
  }
}

import type { NextRequest } from "next/server";

import { apiError, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import {
  cancelInvoice,
  getInvoice,
  renumberInvoice,
  updateDraftInvoice,
} from "@/lib/invoices/service";
import { invoiceDraftSchema, invoiceNumberSchema } from "@/lib/validations/invoice";

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
 * PATCH /api/invoices/:id — poprawka numeru dokumentu.
 *
 * Jedyne pole, które wolno zmienić po wystawieniu, i tylko tam, gdzie otwiera
 * to `renumber.ts`: na wskazanym koncie i w dokumentach nieanulowanych.
 * Reszta treści dokumentu zostaje niezmienna — pomyłkę anuluje się i wystawia
 * na nowo.
 *
 * 403 → konto bez tej furtki
 * 409 → dokument z numerem już zamkniętym albo numer zajęty przez inny
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = invoiceNumberSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await renumberInvoice(auth.organizationId, id, parsed.data.number);

  if (result.ok) return ok({ id, number: result.number });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "NOT_ALLOWED":
      return apiError("FORBIDDEN", auth.d.panel.api.invoiceNumberNotAllowed);
    case "LOCKED":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNumberLocked);
    case "NUMBER_TAKEN":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNumberTaken, {
        fields: { number: [auth.d.panel.api.invoiceNumberTaken] },
      });
  }
}

/**
 * PUT /api/invoices/:id — poprawki szkicu przed zatwierdzeniem.
 *
 * Tylko szkic: wystawiony dokument jest niezmienny, pomyłkę w nim anuluje się
 * i wystawia na nowo. Patrz `src/lib/invoices/draft.ts`.
 *
 * 409 → dokument nie jest już szkicem
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = invoiceDraftSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const result = await updateDraftInvoice(auth.organizationId, id, parsed.data);

  if (result.ok) return ok({ id });

  switch (result.reason) {
    case "NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);
    case "PERIOD_ORDER":
      return apiError("VALIDATION_ERROR", auth.d.panel.invoices.periodOrder, {
        fields: { periodEnd: [auth.d.panel.invoices.periodOrder] },
      });
    case "NOT_DRAFT":
    case "NOTHING_TO_BILL":
      return apiError("CONFLICT", auth.d.panel.api.invoiceNotDraft);
  }
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
        auth.d.panel.api.invoiceHasPayments,
      );
  }
}

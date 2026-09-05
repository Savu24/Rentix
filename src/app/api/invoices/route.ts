import type { NextRequest } from "next/server";

import { apiError, created, ok, validationError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { createInvoice, listInvoices } from "@/lib/invoices/service";
import { invoiceCreateSchema, invoiceListQuerySchema } from "@/lib/validations/invoice";

export const runtime = "nodejs";

/** GET /api/invoices?q=&status=&leaseId=&tenantId=&propertyId=&year= */
export async function GET(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const parsed = invoiceListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  return ok(await listInvoices(auth.organizationId, parsed.data));
}

/**
 * POST /api/invoices — dokument wystawiany ręcznie (kaucja, rozliczenie mediów).
 *
 * Dokumenty czynszowe powstają automatycznie z umów: POST /api/invoices/generate.
 *
 * 201 → { id, number }
 * 404 → najemca albo umowa spoza organizacji
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", auth.d.panel.api.invalidJson);
  }

  const parsed = invoiceCreateSchema(auth.v).safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await createInvoice(auth.organizationId, parsed.data);

  if (result.ok) return created(result.invoice);

  switch (result.reason) {
    case "TENANT_NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.tenant, {
        fields: { tenantId: [auth.d.panel.api.fields.selectTenant] },
      });
    case "LEASE_NOT_FOUND":
      return apiError("NOT_FOUND", auth.d.panel.api.notFound.lease, {
        fields: { leaseId: [auth.d.panel.api.fields.selectLease] },
      });
  }
}

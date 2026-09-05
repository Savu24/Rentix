import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { InvoiceDocument } from "@/lib/invoices/pdf";
import { toInvoicePdfData } from "@/lib/invoices/pdf-data";
import { getInvoice } from "@/lib/invoices/service";
import { slugify } from "@/lib/utils";

// Osadzanie fontu czyta plik TTF z dysku — to wymaga runtime'u Node.
export const runtime = "nodejs";

/**
 * GET /api/invoices/:id/pdf — rachunek, faktura albo naliczenie jako PDF.
 *
 * Dokument renderujemy z zapisanych pozycji, a nie z aktualnych warunków umowy:
 * faktura po wystawieniu jest niezmienna, więc podwyżka czynszu nie może zmienić
 * treści dokumentu sprzed pół roku.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const invoice = await getInvoice(auth.organizationId, id);

  if (!invoice) return apiError("NOT_FOUND", auth.d.panel.api.notFound.invoice);

  const buffer = await renderToBuffer(InvoiceDocument({ data: toInvoicePdfData(invoice) }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slugify(invoice.number)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

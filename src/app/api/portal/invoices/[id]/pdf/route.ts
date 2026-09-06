import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { getApiSession } from "@/lib/auth/session";
import { organizationAllows } from "@/lib/billing/server";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/server";
import { InvoiceDocument } from "@/lib/invoices/pdf";
import { toInvoicePdfData } from "@/lib/invoices/pdf-data";
import { getTenantInvoice } from "@/lib/tenants/portal";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * GET /api/portal/invoices/:id/pdf — dokument pobierany przez najemcę.
 *
 * Osobna trasa od `/api/invoices/:id/pdf`, mimo identycznego wyniku. Tamta
 * zawęża zapytanie organizacją z sesji właściciela, a najemca do żadnej
 * organizacji nie należy; dorabianie drugiej ścieżki autoryzacji w jednym
 * endpoincie to najkrótsza droga do wycieku cudzego dokumentu.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await getApiSession();
  if ("response" in result) return result.response;

  const d = getDictionary(await requestLocale());
  const t = d.panel.api;

  // Panel właściciela ma własną trasę — ta jest wyłącznie dla najemcy.
  if (result.session.user.role !== "TENANT") {
    return apiError("FORBIDDEN", t.ownerOnly);
  }

  const { id } = await params;
  const invoice = await getTenantInvoice(result.session.user.id, id);

  if (!invoice) return apiError("NOT_FOUND", t.notFound.invoice);

  // Portal jest funkcją planu wynajmującego, więc razem z nim znika też dostęp
  // do dokumentów — inaczej zapisany link działałby dalej po zejściu z planu.
  if (!(await organizationAllows(invoice.organizationId, "TENANT_PORTAL"))) {
    // Komunikat od strony najemcy, nie od strony cennika: plan wynajmującego
    // nie jest jego sprawą i nie ma nic, co mógłby z nim zrobić.
    return apiError("FORBIDDEN", d.panel.tenantPortal.unavailableLead);
  }

  const buffer = await renderToBuffer(InvoiceDocument({ data: toInvoicePdfData(invoice) }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slugify(invoice.number)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

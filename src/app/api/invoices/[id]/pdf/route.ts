import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import type { VatRate } from "@/generated/prisma/enums";
import { apiError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { InvoiceDocument, type InvoicePdfData } from "@/lib/invoices/pdf";
import { getInvoice } from "@/lib/invoices/service";
import { formatPropertyAddress } from "@/lib/properties/address";
import { slugify } from "@/lib/utils";

// Osadzanie fontu czyta plik TTF z dysku — to wymaga runtime'u Node.
export const runtime = "nodejs";

/**
 * GET /api/invoices/:id/pdf — rachunek albo faktura jako PDF.
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

  if (!invoice) return apiError("NOT_FOUND", "Nie znaleziono dokumentu.");

  // Rozbicie po stawkach liczymy z zapisanych pozycji — w bazie nie ma na nie
  // kolumny, a przeliczanie z warunków umowy dałoby inny wynik po korekcie.
  const byRate = new Map<VatRate, { netGrosze: number; vatGrosze: number }>();
  for (const line of invoice.lines) {
    const bucket = byRate.get(line.vatRate) ?? { netGrosze: 0, vatGrosze: 0 };
    bucket.netGrosze += line.netGrosze;
    bucket.vatGrosze += line.vatGrosze;
    byRate.set(line.vatRate, bucket);
  }

  const property = invoice.lease?.property;
  const subject = property
    ? [
        property.name,
        invoice.lease?.room ? `pokój ${invoice.lease.room.name}` : null,
        formatPropertyAddress(property),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const data: InvoicePdfData = {
    kind: invoice.kind,
    number: invoice.number,
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    cancelled: invoice.status === "CANCELLED",

    seller: {
      name: invoice.organization.name,
      taxId: invoice.organization.taxId,
      street: invoice.organization.street,
      postalCode: invoice.organization.postalCode,
      city: invoice.organization.city,
    },

    buyer: {
      name: invoice.buyerName,
      taxId: invoice.buyerTaxId,
      street: invoice.buyerStreet,
      postalCode: invoice.buyerPostalCode,
      city: invoice.buyerCity,
    },

    subject,

    lines: invoice.lines.map((line) => ({
      description: line.description,
      // Decimal(12,3) → tysięczne, w których liczy reszta aplikacji.
      quantityMilli: Math.round(Number(line.quantity) * 1000),
      unit: line.unit,
      unitPriceNetGrosze: line.unitPriceNetGrosze,
      vatRate: line.vatRate,
      netGrosze: line.netGrosze,
      vatGrosze: line.vatGrosze,
      grossGrosze: line.grossGrosze,
    })),

    vatBreakdown: [...byRate.entries()].map(([rate, sums]) => ({ rate, ...sums })),

    totalNetGrosze: invoice.totalNetGrosze,
    totalVatGrosze: invoice.totalVatGrosze,
    totalGrossGrosze: invoice.totalGrossGrosze,
    paidGrosze: invoice.paidGrosze,

    notes: invoice.notes,
  };

  const buffer = await renderToBuffer(InvoiceDocument({ data }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slugify(invoice.number)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

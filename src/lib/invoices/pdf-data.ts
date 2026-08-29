import type { VatRate } from "@/generated/prisma/enums";
import { formatPropertyAddress, roomDesignation } from "@/lib/properties/address";

import type { InvoicePdfData } from "./pdf";
import type { getInvoice } from "./service";

/**
 * Rekord z bazy → dane dla PDF-a.
 *
 * Wydzielone z trasy, bo to samo przekształcenie robi pobieranie pojedynczego
 * dokumentu i pobieranie paczki. Dwa niezależne mapowania rozjechałyby się przy
 * pierwszej zmianie układu dokumentu — i zauważyłby to dopiero księgowy.
 */
export type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

export function toInvoicePdfData(invoice: InvoiceWithRelations): InvoicePdfData {
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
        invoice.lease?.room ? `pokój ${roomDesignation(invoice.lease.room.name)}` : null,
        formatPropertyAddress(property),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
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

    logoDataUrl: invoice.organization.logo?.dataUrl ?? null,

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
}

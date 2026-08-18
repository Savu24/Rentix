import { renderToBuffer } from "@react-pdf/renderer";

import { slugify } from "@/lib/utils";

import { InvoiceDocument } from "./pdf";
import { toInvoicePdfData, type InvoiceWithRelations } from "./pdf-data";

/**
 * Dokument jako plik PDF gotowy do załączenia w e-mailu.
 *
 * Wydzielone z trasy pobierania, bo ten sam PDF wysyłamy teraz najemcy —
 * i musi być bajt w bajt tym samym, co właściciel widzi u siebie. Dwie ścieżki
 * renderowania rozjechałyby się przy pierwszej zmianie układu i nikt by tego
 * nie zauważył, bo nikt nie porównuje własnego podglądu z cudzą skrzynką.
 */
export async function renderInvoicePdf(invoice: InvoiceWithRelations) {
  const buffer = await renderToBuffer(InvoiceDocument({ data: toInvoicePdfData(invoice) }));

  return {
    buffer,
    filename: `${slugify(invoice.number)}.pdf`,
  };
}

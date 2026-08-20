// @vitest-environment node
//
// Node, nie jsdom: pdfkit rozpoznaje obrazek przez `src instanceof Uint8Array`,
// a w jsdom ta sama tablica pochodzi z innego realmu i test poszedłby ścieżką
// „to jest ścieżka do pliku", czego produkcja (runtime nodejs) nigdy nie robi.
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { InvoiceDocument, type InvoicePdfData } from "@/lib/invoices/pdf";

/** 1×1 PNG — najmniejszy obrazek, jaki renderer musi umieć osadzić. */
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const DOCUMENT: InvoicePdfData = {
  kind: "BILL",
  number: "2026/08/1",
  issueDate: new Date("2026-08-01T00:00:00Z"),
  saleDate: new Date("2026-08-01T00:00:00Z"),
  dueDate: new Date("2026-08-10T00:00:00Z"),
  periodStart: null,
  periodEnd: null,
  cancelled: false,

  seller: {
    name: "Kowalski Nieruchomości",
    taxId: null,
    street: "Długa 14",
    postalCode: "30-001",
    city: "Kraków",
  },
  logoDataUrl: null,
  buyer: { name: "Jan Nowak", taxId: null, street: null, postalCode: null, city: null },

  subject: null,
  lines: [
    {
      description: "Czynsz",
      quantityMilli: 1000,
      unit: "szt.",
      unitPriceNetGrosze: 240000,
      vatRate: "ZW",
      netGrosze: 240000,
      vatGrosze: 0,
      grossGrosze: 240000,
    },
  ],
  vatBreakdown: [{ rate: "ZW", netGrosze: 240000, vatGrosze: 0 }],

  totalNetGrosze: 240000,
  totalVatGrosze: 0,
  totalGrossGrosze: 240000,
  paidGrosze: 0,
  notes: null,
};

/**
 * Logo jest jedynym elementem dokumentu, który potrafi zniknąć bez błędu:
 * niewspierany format renderer po prostu pomija. Stąd test na samym
 * renderowaniu, a nie tylko na walidacji tego, co wpuszczamy do bazy.
 */
describe("logo wystawcy w PDF-ie", () => {
  it("dokument bez logo renderuje się jak dotąd", async () => {
    const pdf = await renderToBuffer(InvoiceDocument({ data: DOCUMENT }));
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("logo z data URI trafia do pliku", async () => {
    const [without, withLogo] = await Promise.all([
      renderToBuffer(InvoiceDocument({ data: DOCUMENT })),
      renderToBuffer(InvoiceDocument({ data: { ...DOCUMENT, logoDataUrl: PNG } })),
    ]);

    // Osadzony obrazek waży swoje — dokument z logo musi być większy.
    expect(withLogo.length).toBeGreaterThan(without.length);
  });
});

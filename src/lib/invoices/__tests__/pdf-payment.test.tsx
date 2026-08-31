// @vitest-environment node
//
// Node, nie jsdom — z tego samego powodu co w `pdf-logo.test.tsx`: renderer
// PDF-a pracuje na buforach Node'a.
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { InvoiceDocument, type InvoicePdfData } from "@/lib/invoices/pdf";

const ACCOUNT = "12345678901234567890123456";

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
  bankAccount: null,
  lines: [
    {
      description: "Czynsz",
      quantityMilli: 1000,
      unit: "szt.",
      unitPriceNetGrosze: 165000,
      vatRate: "ZW",
      netGrosze: 165000,
      vatGrosze: 0,
      grossGrosze: 165000,
    },
  ],
  vatBreakdown: [{ rate: "ZW", netGrosze: 165000, vatGrosze: 0 }],

  totalNetGrosze: 165000,
  totalVatGrosze: 0,
  totalGrossGrosze: 165000,
  paidGrosze: 0,
  notes: null,
};

const render = (data: Partial<InvoicePdfData>) =>
  renderToBuffer(InvoiceDocument({ data: { ...DOCUMENT, ...data } }));

/**
 * Treści PDF-a nie da się przeczytać z bufora — strumień jest skompresowany.
 * Porównujemy więc rozmiar: dołożony blok tekstu waży swoje, a dokument bez
 * niego jest co do bajta tak samo długi jak ten, który go nigdy nie miał.
 */
describe("rozliczenie wpłat na dokumencie", () => {
  it("spłacony w całości wygląda tak samo jak przed wpłatą", async () => {
    // Sedno zmiany: para „Wpłacono / Pozostaje 0,00 zł" znikała z rachunku,
    // bo zmieniała treść dokumentu już po jego wystawieniu.
    const [unpaid, paid] = await Promise.all([
      render({}),
      render({ paidGrosze: DOCUMENT.totalGrossGrosze }),
    ]);

    expect(paid.length).toBe(unpaid.length);
  });

  it("nadpłata też nie dokłada bloku", async () => {
    const [unpaid, overpaid] = await Promise.all([
      render({}),
      render({ paidGrosze: DOCUMENT.totalGrossGrosze + 5000 }),
    ]);

    expect(overpaid.length).toBe(unpaid.length);
  });

  it("częściowa wpłata pokazuje, ile zostało", async () => {
    const [unpaid, partial] = await Promise.all([render({}), render({ paidGrosze: 50000 })]);

    expect(partial.length).toBeGreaterThan(unpaid.length);
  });
});

describe("rachunek do przelewu na dokumencie", () => {
  it("numer z ustawień trafia na dokument", async () => {
    const [without, withAccount] = await Promise.all([
      render({}),
      render({ bankAccount: ACCOUNT }),
    ]);

    expect(withAccount.length).toBeGreaterThan(without.length);
  });

  it("zostaje na dokumencie po zapłacie", async () => {
    // Rachunek to dana wystawcy, nie stan rozliczenia — dokument ma wyglądać
    // tak samo przed wpłatą i po niej.
    const [before, after] = await Promise.all([
      render({ bankAccount: ACCOUNT }),
      render({ bankAccount: ACCOUNT, paidGrosze: DOCUMENT.totalGrossGrosze }),
    ]);

    expect(after.length).toBe(before.length);
  });

  it("na anulowanym nie ma na co przelewać", async () => {
    const [cancelled, cancelledWithAccount] = await Promise.all([
      render({ cancelled: true }),
      render({ cancelled: true, bankAccount: ACCOUNT }),
    ]);

    expect(cancelledWithAccount.length).toBe(cancelled.length);
  });
});

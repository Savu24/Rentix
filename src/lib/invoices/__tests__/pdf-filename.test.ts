import { describe, expect, it } from "vitest";

import { invoicePdfFilename } from "@/lib/invoices/pdf-data";

/**
 * Nazwa pliku, pod którą dokument ląduje w folderze pobranych.
 *
 * Odkąd faktura idzie bez liter serii, sam numer nie mówi już, co to za
 * dokument — nazwa musi to powiedzieć za niego.
 */
const pl = { organization: { locale: "pl" } };

describe("invoicePdfFilename", () => {
  it("sklada nazwe z rodzaju dokumentu i numeru", () => {
    expect(invoicePdfFilename({ ...pl, kind: "VAT_INVOICE", number: "3/09/2026" })).toBe(
      "faktura-3-09-2026.pdf",
    );
  });

  it("zachowuje litery serii tam, gdzie numer je nosi", () => {
    expect(invoicePdfFilename({ ...pl, kind: "BILL", number: "R 3/09/2026" })).toBe(
      "rachunek-r-3-09-2026.pdf",
    );
  });

  it("radzi sobie z numerem poprawionym recznie", () => {
    // Numer da się przepisać na format biura rachunkowego (`renumber.ts`),
    // a nazwa pliku nie może się na tym wywrócić.
    expect(invoicePdfFilename({ ...pl, kind: "VAT_INVOICE", number: "FV-2026-08-03" })).toBe(
      "faktura-fv-2026-08-03.pdf",
    );
  });

  it("idzie za krajem konta", () => {
    const uk = { organization: { locale: "uk" } };
    expect(invoicePdfFilename({ ...uk, kind: "BILL", number: "INV 3/09/2026" })).toBe(
      "rent-invoice-inv-3-09-2026.pdf",
    );
  });
});

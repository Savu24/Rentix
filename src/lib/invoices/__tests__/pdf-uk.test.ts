import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n";
import { invoiceLayout, type InvoicePdfData } from "@/lib/invoices/pdf";
import { formatInvoiceNumber } from "@/lib/invoices/numbering";
import { formatBankAccount } from "@/lib/bank-account";
import { selectableInvoiceKinds } from "@/lib/validations/invoice";

/**
 * Brytyjski rachunek za czynsz to nie polska faktura po angielsku.
 *
 * Te testy pilnują różnic, które da się przeoczyć: pozycji wymaganych przez
 * FA(2), a w Wielkiej Brytanii bezsensownych, i odwrotnie. Sprawdzamy same
 * rozstrzygnięcia, bo złożonego PDF-a nie da się odczytać z bufora.
 */

const BASE: InvoicePdfData = {
  locale: "pl",
  kind: "BILL",
  number: "R 1/08/2026",
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

const uk = (overrides: Partial<InvoicePdfData> = {}) =>
  invoiceLayout({ ...BASE, locale: "uk", ...overrides });
const pl = (overrides: Partial<InvoicePdfData> = {}) =>
  invoiceLayout({ ...BASE, ...overrides });

describe("rachunek brytyjski kontra polska faktura", () => {
  it("bez podatku nie pokazuje kolumn VAT-owskich", () => {
    // Najem mieszkaniowy jest w Wielkiej Brytanii zwolniony, więc netto, VAT
    // i brutto niosłyby tę samą liczbę trzy razy.
    expect(uk().showVat).toBe(false);
    // Polska faktura musi mieć to rozbicie także przy stawce zwolnionej.
    expect(pl().showVat).toBe(true);
  });

  it("pokazuje VAT, gdy podatek naprawdę jest", () => {
    expect(uk({ totalVatGrosze: 3795 }).showVat).toBe(true);
    expect(uk({ kind: "VAT_INVOICE" }).showVat).toBe(true);
  });

  it("nie ma daty sprzedaży poza fakturą VAT", () => {
    // To pozycja wymagana przez FA(2); na rachunku za czynsz nic nie znaczy.
    expect(uk().showSaleDate).toBe(false);
    expect(uk({ kind: "VAT_INVOICE" }).showSaleDate).toBe(true);
    expect(pl().showSaleDate).toBe(true);
  });

  it("nie ma kwoty słownie ani rubryk podpisu", () => {
    // Jedno to wymóg polskiej faktury, drugie polska konwencja papierowa.
    expect(uk().showAmountInWords).toBe(false);
    expect(uk().showSignatures).toBe(false);
    expect(pl().showAmountInWords).toBe(true);
    expect(pl().showSignatures).toBe(true);
  });

  it("prosi o numer w tytule przelewu", () => {
    // Brytyjska wpłata przychodzi bez opisu, jeśli o niego nie poprosić.
    expect(uk().showPaymentReference).toBe(true);
    expect(pl().showPaymentReference).toBe(false);
  });

  it("rozliczenie wpłat zachowuje się tak samo w obu krajach", () => {
    expect(uk({ paidGrosze: 50000 }).showSettlement).toBe(true);
    expect(uk({ paidGrosze: 165000 }).showSettlement).toBe(false);
  });
});

describe("teksty dokumentu", () => {
  it("nie zostawia polskich pozycji w wersji brytyjskiej", () => {
    const t = getDictionary("uk").documents.invoice;

    expect(t.seller).toBe("From");
    expect(t.buyer).toBe("Bill to");
    expect(t.taxIdLabel).not.toContain("NIP");
    expect(getDictionary("uk").panel.invoices.vat.ZW).toBe("Exempt");
  });
});

describe("numeracja dokumentów", () => {
  it("bierze prefiks z wersji krajowej", () => {
    expect(formatInvoiceNumber("BILL", 3, 2026, 7, "pl")).toBe("R 3/08/2026");
    expect(formatInvoiceNumber("BILL", 3, 2026, 7, "uk")).toBe("INV 3/08/2026");
    expect(formatInvoiceNumber("CHARGE", 1, 2026, 0, "uk")).toBe("CHG 1/01/2026");
  });
});

describe("rachunek do przelewu", () => {
  it("polski numer idzie grupami po cztery", () => {
    expect(formatBankAccount("12345678901234567890123456", "pl")).toBe(
      "12 3456 7890 1234 5678 9012 3456",
    );
  });

  it("brytyjski to sort code i numer konta, a nie IBAN", () => {
    // Sześć cyfr sort code'u z myślnikami, potem osiem cyfr numeru konta.
    expect(formatBankAccount("12345612345678", "uk")).toBe("12-34-56 12345678");
  });
});

describe("rodzaje dokumentu do wyboru", () => {
  it("wersja brytyjska nie wystawia polskiej faktury VAT", () => {
    expect(selectableInvoiceKinds("uk")).not.toContain("VAT_INVOICE");
    expect(selectableInvoiceKinds("pl")).toContain("VAT_INVOICE");
  });

  it("rachunek i naliczenie zostają w obu", () => {
    for (const locale of ["pl", "uk"] as const) {
      expect(selectableInvoiceKinds(locale)).toContain("BILL");
      expect(selectableInvoiceKinds(locale)).toContain("CHARGE");
    }
  });
});

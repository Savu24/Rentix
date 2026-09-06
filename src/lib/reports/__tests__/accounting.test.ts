import { describe, expect, it } from "vitest";

import {
  accountingCsvRows,
  parseRange,
  type AccountingExport,
  type ExportLabels,
} from "@/lib/reports/accounting";

/**
 * Składanie arkusza bez bazy: dane wchodzą gotowe, tak jak wchodzą z
 * `accounting-server.ts`. Najłatwiej pomylić się właśnie tutaj — w kolejności
 * kolumn i w tym, co wchodzi do podsumowania.
 */

const LABELS: ExportLabels = {
  heading: "nagłówek",
  documents: {
    title: "DOKUMENTY",
    columns: ["numer"],
    kinds: { BILL: "Rachunek", VAT_INVOICE: "Faktura", PROFORMA: "Proforma", CHARGE: "Naliczenie" },
    statuses: {
      DRAFT: "Szkic",
      ISSUED: "Wystawiony",
      PARTIALLY_PAID: "Częściowo",
      PAID: "Opłacony",
      CANCELLED: "Anulowany",
    },
  },
  payments: {
    title: "WPŁATY",
    columns: ["data"],
    methods: {
      TRANSFER: "Przelew",
      CASH: "Gotówka",
      CARD: "Karta",
      DIRECT_DEBIT: "Polecenie",
      OTHER: "Inna",
    },
  },
  expenses: {
    title: "KOSZTY",
    columns: ["data"],
    categories: {
      MORTGAGE: "Kredyt",
      RENT: "Czynsz",
      COMMUNITY_FEE: "Wspólnota",
      UTILITIES: "Media",
      REPAIR: "Naprawa",
      FURNISHING: "Wyposażenie",
      INSURANCE: "Ubezpieczenie",
      PROPERTY_TAX: "Podatek",
      INCOME_TAX: "Ryczałt",
      MANAGEMENT: "Zarządzanie",
      ACCOUNTING: "Księgowość",
      LEGAL: "Prawo",
      OTHER: "Inne",
    },
  },
  summary: {
    title: "PODSUMOWANIE",
    invoiced: "Sprzedaż brutto",
    invoicedNet: "Sprzedaż netto",
    invoicedVat: "VAT",
    received: "Wpływy",
    expenses: "Koszty",
    result: "Wynik",
  },
  unassigned: "bez przypisania",
};

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const DATA: AccountingExport = {
  range: { from: date("2026-01-01"), to: date("2026-12-31") },
  documents: [
    {
      number: "R 1/01/2026",
      kind: "BILL",
      status: "ISSUED",
      issueDate: date("2026-01-05"),
      saleDate: date("2026-01-05"),
      dueDate: date("2026-01-12"),
      buyerName: "Anna Kowalska",
      buyerTaxId: null,
      propertyName: "Długa 14",
      totalNetGrosze: 240000,
      totalVatGrosze: 0,
      totalGrossGrosze: 240000,
      paidGrosze: 100000,
    },
  ],
  payments: [
    {
      paidAt: date("2026-01-10"),
      invoiceNumber: "R 1/01/2026",
      payerName: "Anna Kowalska",
      amountGrosze: 100000,
      method: "TRANSFER",
      reference: null,
    },
  ],
  expenses: [
    {
      paidAt: date("2026-01-20"),
      category: "COMMUNITY_FEE",
      description: "Czynsz do wspólnoty",
      vendor: null,
      documentRef: null,
      propertyName: null,
      amountGrosze: 40000,
    },
  ],
  totals: {
    invoicedGrosze: 240000,
    invoicedNetGrosze: 240000,
    invoicedVatGrosze: 0,
    receivedGrosze: 100000,
    expensesGrosze: 40000,
  },
};

describe("zakres dat", () => {
  it("bez parametrów bierze cały rok", () => {
    const range = parseRange(null, null, 2026);

    expect(range.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("odwrócony zakres prostuje zamiast zwracać pusty plik", () => {
    const range = parseRange("2026-06-30", "2026-03-01", 2026);

    expect(range.from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });

  it("śmieci w parametrze cofają do roku domyślnego", () => {
    const range = parseRange("wczoraj", "2026-13-45", 2026);

    expect(range.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});

describe("arkusz eksportu", () => {
  it("komplet ma trzy sekcje i podsumowanie", () => {
    const rows = accountingCsvRows(DATA, "all", "pl", LABELS);
    const titles = rows.map((row) => row[0]);

    expect(titles).toContain("DOKUMENTY");
    expect(titles).toContain("WPŁATY");
    expect(titles).toContain("KOSZTY");
    expect(titles).toContain("PODSUMOWANIE");
  });

  it("pojedyncza sekcja idzie bez podsumowania", () => {
    // Podsumowanie liczyłoby pozycje, których w pliku nie ma.
    const rows = accountingCsvRows(DATA, "expenses", "pl", LABELS);
    const titles = rows.map((row) => row[0]);

    expect(titles).toContain("KOSZTY");
    expect(titles).not.toContain("DOKUMENTY");
    expect(titles).not.toContain("PODSUMOWANIE");
  });

  it("wiersz dokumentu liczy, ile zostało do zapłaty", () => {
    const rows = accountingCsvRows(DATA, "documents", "pl", LABELS);
    const document = rows.find((row) => row[0] === "R 1/01/2026")!;

    expect(document).toContain("2400,00");
    expect(document).toContain("1000,00");
    // brutto − zapłacone
    expect(document.at(-2)).toBe("1400,00");
  });

  it("pozycja bez nieruchomości dostaje własną etykietę, nie puste pole", () => {
    const rows = accountingCsvRows(DATA, "expenses", "pl", LABELS);

    expect(rows.at(-1)).toContain("bez przypisania");
  });

  it("wpływy i sprzedaż stoją w podsumowaniu osobno", () => {
    // Dwie różne podstawy: memoriałowa i kasowa. Sklejenie ich byłoby błędem.
    const rows = accountingCsvRows(DATA, "all", "pl", LABELS);
    const find = (label: string) => rows.find((row) => row[0] === label)?.[1];

    expect(find("Sprzedaż brutto")).toBe("2400,00");
    expect(find("Wpływy")).toBe("1000,00");
    expect(find("Wynik")).toBe("600,00");
  });

  it("kwoty idą separatorem kraju konta", () => {
    const rows = accountingCsvRows(DATA, "all", "uk", LABELS);
    const received = rows.find((row) => row[0] === "Wpływy")?.[1];

    expect(received).toBe("1000.00");
  });
});

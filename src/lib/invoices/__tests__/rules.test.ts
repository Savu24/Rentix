import { describe, expect, it } from "vitest";

import {
  buyerSnapshot,
  invoiceKindForLines,
  rentVatRate,
  settlementStatus,
} from "@/lib/invoices/rules";
import { formatInvoiceNumber, withUniqueNumberRetry } from "@/lib/invoices/numbering";

describe("buyerSnapshot", () => {
  const TENANT = {
    firstName: "Jan",
    lastName: "Kowalski",
    taxId: null,
    street: "Przykładowa 7",
    postalCode: "49-659",
    city: "Kraków",
  };

  it("kopiuje dane nabywcy z profilu najemcy", () => {
    expect(buyerSnapshot(TENANT)).toEqual({
      buyerName: "Jan Kowalski",
      buyerTaxId: null,
      buyerStreet: "Przykładowa 7",
      buyerPostalCode: "49-659",
      buyerCity: "Kraków",
    });
  });

  it("migawka nie zmienia się po edycji profilu", () => {
    const snapshot = buyerSnapshot(TENANT);
    const renamed = { ...TENANT, lastName: "Nowak", city: "Gdańsk" };

    // Dokument księgowy musi pokazywać stan z dnia wystawienia — nowa migawka
    // jest inna, ale ta wcześniejsza zostaje nietknięta.
    expect(buyerSnapshot(renamed).buyerName).toBe("Jan Nowak");
    expect(snapshot.buyerName).toBe("Jan Kowalski");
    expect(snapshot.buyerCity).toBe("Kraków");
  });
});

describe("invoiceKindForLines", () => {
  it("same stawki bez podatku dają rachunek", () => {
    expect(invoiceKindForLines([{ vatRate: "ZW" }, { vatRate: "NP" }])).toBe("BILL");
  });

  it("stawka 0% to nadal brak podatku należnego", () => {
    expect(invoiceKindForLines([{ vatRate: "RATE_0" }])).toBe("BILL");
  });

  it("jedna pozycja z podatkiem wymusza fakturę VAT", () => {
    expect(invoiceKindForLines([{ vatRate: "ZW" }, { vatRate: "RATE_23" }])).toBe("VAT_INVOICE");
  });
});

describe("rentVatRate", () => {
  it("najem mieszkaniowy jest zwolniony", () => {
    for (const type of ["APARTMENT", "HOUSE", "ROOM", "BUILDING"] as const) {
      expect(rentVatRate(type)).toBe("ZW");
    }
  });

  it("lokal użytkowy i miejsce postojowe idą ze stawką podstawową", () => {
    expect(rentVatRate("COMMERCIAL")).toBe("RATE_23");
    expect(rentVatRate("PARKING")).toBe("RATE_23");
  });
});

describe("settlementStatus", () => {
  it("brak wpłat zostawia dokument wystawiony", () => {
    expect(settlementStatus(240000, 0)).toBe("ISSUED");
  });

  it("wpłata częściowa", () => {
    expect(settlementStatus(240000, 100000)).toBe("PARTIALLY_PAID");
  });

  it("wpłata co do grosza zamyka dokument", () => {
    expect(settlementStatus(240000, 240000)).toBe("PAID");
  });

  it("nadpłata też oznacza opłacony", () => {
    // Zwrot nadpłaty to osobny temat — dokument nie może zostawać na liście
    // zaległości tylko dlatego, że najemca przelał za dużo.
    expect(settlementStatus(240000, 250000)).toBe("PAID");
  });
});

describe("formatInvoiceNumber", () => {
  it("składa numer w zapisie oczekiwanym przez księgowość", () => {
    expect(formatInvoiceNumber("BILL", 3, 2026, 7)).toBe("R 3/08/2026");
    expect(formatInvoiceNumber("VAT_INVOICE", 1, 2026, 0)).toBe("FV 1/01/2026");
    expect(formatInvoiceNumber("PROFORMA", 12, 2026, 11)).toBe("PF 12/12/2026");
  });
});

describe("withUniqueNumberRetry", () => {
  it("ponawia po kolizji numeru i zwraca wynik udanej próby", async () => {
    let attempts = 0;

    const result = await withUniqueNumberRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("unique"), { code: "P2002" });
      return "R 3/08/2026";
    });

    expect(result).toBe("R 3/08/2026");
    expect(attempts).toBe(3);
  });

  it("nie połyka błędów niezwiązanych z unikalnością", async () => {
    let attempts = 0;

    await expect(
      withUniqueNumberRetry(async () => {
        attempts += 1;
        throw new Error("baza padła");
      }),
    ).rejects.toThrow("baza padła");

    // Bez tego pojedyncza awaria bazy zamieniałaby się w pięć zapytań.
    expect(attempts).toBe(1);
  });

  it("po wyczerpaniu prób oddaje ostatni błąd", async () => {
    await expect(
      withUniqueNumberRetry(async () => {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }, 2),
    ).rejects.toThrow("unique");
  });
});

import { describe, expect, it } from "vitest";

import { invoiceListQuerySchema } from "@/lib/validations/invoice";

describe("filtry listy dokumentów", () => {
  it("puste parametry dają widok bez zawężeń", () => {
    const result = invoiceListQuerySchema.parse({});
    expect(result.status).toBe("all");
    expect(result.issuedFrom).toBeUndefined();
    expect(result.minAmount).toBeUndefined();
  });

  it("czyta zakres dat w UTC", () => {
    const result = invoiceListQuerySchema.parse({ issuedFrom: "2026-08-01", issuedTo: "2026-08-31" });

    expect(result.issuedFrom?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(result.issuedTo?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("niepoprawna data nie wywraca listy, tylko znika", () => {
    // Filtry siedzą w adresie URL — obcięty albo przerobiony link nie może
    // kończyć się błędem całej strony.
    const result = invoiceListQuerySchema.safeParse({ issuedFrom: "wczoraj", dueTo: "2026-13-45" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issuedFrom).toBeUndefined();
      expect(result.data.dueTo).toBeUndefined();
    }
  });

  it("przyjmuje zakres kwot i rodzaj dokumentu", () => {
    const result = invoiceListQuerySchema.parse({
      minAmount: "100",
      maxAmount: "2500.50",
      kind: "CHARGE",
    });

    expect(result.minAmount).toBe(100);
    expect(result.maxAmount).toBe(2500.5);
    expect(result.kind).toBe("CHARGE");
  });

  it("odrzuca nieznany rodzaj dokumentu", () => {
    expect(invoiceListQuerySchema.safeParse({ kind: "PARAGON" }).success).toBe(false);
  });

  it("odrzuca ujemną kwotę", () => {
    expect(invoiceListQuerySchema.safeParse({ minAmount: "-5" }).success).toBe(false);
  });
});

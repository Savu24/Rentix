import { describe, expect, it } from "vitest";

import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_ORDER,
  expenseFormSchema,
} from "@/lib/validations/expense";

const VALID = {
  category: "COMMUNITY_FEE" as const,
  amountGrosze: "450,00",
  paidAt: "2026-08-10",
  description: "Czynsz do wspólnoty za sierpień",
};

describe("expenseFormSchema", () => {
  it("przelicza kwotę na grosze", () => {
    expect(expenseFormSchema.parse(VALID).amountGrosze).toBe(45000);
  });

  it("odrzuca kwotę zerową i ujemną", () => {
    expect(expenseFormSchema.safeParse({ ...VALID, amountGrosze: "0" }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...VALID, amountGrosze: "-10" }).success).toBe(false);
  });

  it("wymaga opisu — bez niego zestawienie jest nieczytelne", () => {
    expect(expenseFormSchema.safeParse({ ...VALID, description: "  " }).success).toBe(false);
  });

  it("buduje datę w UTC, niezależnie od strefy serwera", () => {
    expect(expenseFormSchema.parse(VALID).paidAt.toISOString()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("puste pole nieruchomości oznacza koszt ogólny", () => {
    expect(expenseFormSchema.parse(VALID).propertyId).toBeNull();
    expect(expenseFormSchema.parse({ ...VALID, propertyId: "" }).propertyId).toBeNull();
    expect(expenseFormSchema.parse({ ...VALID, propertyId: "prop_1" }).propertyId).toBe("prop_1");
  });

  it("domyślną kategorią jest 'Inne'", () => {
    const withoutCategory = {
      amountGrosze: VALID.amountGrosze,
      paidAt: VALID.paidAt,
      description: VALID.description,
    };
    expect(expenseFormSchema.parse(withoutCategory).category).toBe("OTHER");
  });

  it("puste pola opcjonalne dają null, nie pusty string", () => {
    const result = expenseFormSchema.parse({ ...VALID, vendor: "", documentRef: "", notes: "" });
    expect(result.vendor).toBeNull();
    expect(result.documentRef).toBeNull();
    expect(result.notes).toBeNull();
  });
});

describe("katalog kategorii", () => {
  it("kolejność na liście pokrywa wszystkie kategorie", () => {
    // Kategoria pominięta w kolejności zniknęłaby z listy wyboru, choć dalej
    // istniałaby w bazie — i nie dałoby się jej wpisać.
    const labelled = Object.keys(EXPENSE_CATEGORY_LABEL).sort();
    expect([...EXPENSE_CATEGORY_ORDER].sort()).toEqual(labelled);
  });

  it("nie powtarza pozycji", () => {
    expect(new Set(EXPENSE_CATEGORY_ORDER).size).toBe(EXPENSE_CATEGORY_ORDER.length);
  });
});

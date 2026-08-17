import { describe, expect, it } from "vitest";

import { leaseListQuerySchema } from "@/lib/validations/lease";

describe("filtr archiwum na liście umów", () => {
  it("domyślnie chowa zarchiwizowane", () => {
    // Lista robocza ma pokazywać umowy, którymi się zarządza — wypowiedziane
    // i wygasłe tylko ją zaśmiecają.
    expect(leaseListQuerySchema.parse({}).includeArchived).toBe(false);
  });

  it("wartość true z adresu URL włącza pokazywanie archiwum", () => {
    expect(leaseListQuerySchema.parse({ includeArchived: "true" }).includeArchived).toBe(true);
    expect(leaseListQuerySchema.parse({ includeArchived: true }).includeArchived).toBe(true);
  });

  it("każda inna wartość zostawia archiwum ukryte", () => {
    // Filtr siedzi w adresie, więc przypadkowa wartość ma wracać do bezpiecznego
    // domyślnego zachowania, a nie odsłaniać zarchiwizowanych umów.
    for (const value of ["false", "1", "tak", ""]) {
      expect(leaseListQuerySchema.parse({ includeArchived: value }).includeArchived).toBe(false);
    }
  });
});

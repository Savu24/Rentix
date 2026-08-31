import { describe, expect, it } from "vitest";

import { sortTenants, type SortableTenant } from "@/lib/tenants/sort";

const tenant = (lastName: string, overrides: Partial<SortableTenant> = {}): SortableTenant => ({
  firstName: "Anna",
  lastName,
  archivedAt: null,
  outstandingGrosze: 0,
  lease: null,
  ...overrides,
});

const withLease = (lastName: string, lease: SortableTenant["lease"]) => tenant(lastName, { lease });

const names = (tenants: SortableTenant[]) => tenants.map((entry) => entry.lastName);

describe("sortTenants", () => {
  it("domyślnie po nazwisku, po polsku", () => {
    const result = sortTenants([tenant("Żak"), tenant("Ćwik"), tenant("Adamska")], "name");
    expect(names(result)).toEqual(["Adamska", "Ćwik", "Żak"]);
  });

  it("po adresie mieszkania, a bez umowy na końcu", () => {
    const result = sortTenants(
      [
        tenant("Bezumowny"),
        withLease("Nowak", { status: "ACTIVE", propertyAddress: "Wrocławska 2, 30-001 Kraków" }),
        withLease("Kowal", { status: "ACTIVE", propertyAddress: "Długa 14/3, 30-001 Kraków" }),
      ],
      "address",
    );
    expect(names(result)).toEqual(["Kowal", "Nowak", "Bezumowny"]);
  });

  it("po saldzie: największa zaległość na górze", () => {
    const result = sortTenants(
      [
        tenant("Rozliczony"),
        tenant("Drobny", { outstandingGrosze: 12000 }),
        tenant("Zalega", { outstandingGrosze: 480000 }),
      ],
      "debt",
    );
    expect(names(result)).toEqual(["Zalega", "Drobny", "Rozliczony"]);
  });

  it("po statusie umowy: aktywna, rezerwacja, szkic, bez umowy", () => {
    const result = sortTenants(
      [
        tenant("Bezumowny"),
        withLease("Szkicowy", { status: "DRAFT", propertyAddress: "Długa 14" }),
        withLease("Aktywny", { status: "ACTIVE", propertyAddress: "Długa 14" }),
        withLease("Rezerwacja", { status: "RESERVED", propertyAddress: "Długa 14" }),
      ],
      "leaseStatus",
    );
    expect(names(result)).toEqual(["Aktywny", "Rezerwacja", "Szkicowy", "Bezumowny"]);
  });

  it("zarchiwizowani zawsze na końcu", () => {
    const result = sortTenants(
      [
        tenant("Schowany", { archivedAt: new Date("2026-01-01"), outstandingGrosze: 900000 }),
        tenant("Bieżący", { outstandingGrosze: 100 }),
      ],
      "debt",
    );
    expect(names(result)).toEqual(["Bieżący", "Schowany"]);
  });

  it("nie rusza tablicy wejściowej", () => {
    const input = [tenant("Żak"), tenant("Adamska")];
    sortTenants(input, "name");
    expect(names(input)).toEqual(["Żak", "Adamska"]);
  });
});

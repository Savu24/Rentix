import { describe, expect, it } from "vitest";

import {
  RENUMBER_CUTOFF,
  invoiceNumberEditable,
  organizationInAllowlist,
  parseOrganizationAllowlist,
} from "@/lib/invoices/renumber";
import { sequenceInNumber } from "@/lib/invoices/numbering";

const before = new Date(RENUMBER_CUTOFF.getTime() - 1);
const after = new Date(RENUMBER_CUTOFF.getTime() + 1);

describe("parseOrganizationAllowlist", () => {
  it("rozdziela wpisy po przecinku i przycina odstępy", () => {
    expect(parseOrganizationAllowlist(" miret , inne-konto ")).toEqual(["miret", "inne-konto"]);
  });

  it("pusta wartość znaczy „nikt”, a nie „wszyscy”", () => {
    expect(parseOrganizationAllowlist("")).toEqual([]);
    expect(parseOrganizationAllowlist(" , ")).toEqual([]);
  });
});

describe("organizationInAllowlist", () => {
  const allowlist = parseOrganizationAllowlist("miret,clx0000000000000000000000");

  it("dopasowuje po slugu, bez względu na wielkość liter", () => {
    expect(organizationInAllowlist({ id: "clxaaa", slug: "Miret" }, allowlist)).toBe(true);
  });

  it("dopasowuje po identyfikatorze, gdy slug wyszedł inny niż nazwa", () => {
    const organization = { id: "clx0000000000000000000000", slug: "miret-sp-z-o-o" };
    expect(organizationInAllowlist(organization, allowlist)).toBe(true);
  });

  it("obce konto zostaje poza listą", () => {
    expect(organizationInAllowlist({ id: "clxbbb", slug: "inne" }, allowlist)).toBe(false);
  });
});

describe("invoiceNumberEditable", () => {
  it("dokument sprzed odcięcia wolno poprawić", () => {
    expect(invoiceNumberEditable({ createdAt: before, status: "ISSUED" })).toBe(true);
  });

  it("dokument wystawiony po odcięciu ma numer nienaruszalny", () => {
    expect(invoiceNumberEditable({ createdAt: after, status: "ISSUED" })).toBe(false);
    // Sama granica należy już do nowych zasad.
    expect(invoiceNumberEditable({ createdAt: RENUMBER_CUTOFF, status: "ISSUED" })).toBe(false);
  });

  it("opłacony sprzed odcięcia nadal wolno poprawić — chodzi o rejestr, nie o kasę", () => {
    expect(invoiceNumberEditable({ createdAt: before, status: "PAID" })).toBe(true);
  });

  it("anulowany zostaje nietknięty, żeby w rejestrze nie powstała dziura", () => {
    expect(invoiceNumberEditable({ createdAt: before, status: "CANCELLED" })).toBe(false);
  });
});

describe("sequenceInNumber", () => {
  it("czyta numer porządkowy z zapisu nadanego przez Rentiksa", () => {
    expect(sequenceInNumber("FV 3/08/2026", 2026, 7)).toBe(3);
    expect(sequenceInNumber("R 12/08/2026", 2026, 7)).toBe(12);
  });

  it("pomija dokument z innego miesiąca albo roku", () => {
    expect(sequenceInNumber("FV 3/07/2026", 2026, 7)).toBeNull();
    expect(sequenceInNumber("FV 3/08/2025", 2026, 7)).toBeNull();
  });

  it("numer poprawiony ręcznie na obcy format jest nie do odczytania", () => {
    expect(sequenceInNumber("FV-2026-08-03", 2026, 7)).toBeNull();
  });

  /*
    Sedno poprawki w `nextInvoiceNumber`: po przenumerowaniu trzeciego dokumentu
    na „4" liczba dokumentów (3) już nie mówi, który numer jest wolny.
  */
  it("po przenumerowaniu największy numer jest wyższy niż liczba dokumentów", () => {
    const numbers = ["FV 1/08/2026", "FV 2/08/2026", "FV 4/08/2026"];
    const highest = numbers.reduce(
      (max, number) => Math.max(max, sequenceInNumber(number, 2026, 7) ?? 0),
      numbers.length,
    );

    expect(highest).toBe(4);
  });
});

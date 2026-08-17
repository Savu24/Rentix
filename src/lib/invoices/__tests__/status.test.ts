import { describe, expect, it } from "vitest";

import {
  daysOverdue,
  remainingGrosze,
  resolveInvoiceStatus,
  type InvoiceLike,
} from "@/lib/invoices/status";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const NOW = utc("2026-08-16");

const invoice = (overrides: Partial<InvoiceLike> = {}): InvoiceLike => ({
  status: "ISSUED",
  dueDate: utc("2026-08-31"),
  totalGrossGrosze: 240000,
  paidGrosze: 0,
  ...overrides,
});

describe("daysOverdue", () => {
  it("liczy dni po terminie", () => {
    expect(daysOverdue(utc("2026-08-10"), NOW)).toBe(6);
  });

  it("dzień terminu to jeszcze nie zaległość", () => {
    expect(daysOverdue(utc("2026-08-16"), NOW)).toBe(0);
  });

  it("zwraca wartości ujemne przed terminem", () => {
    expect(daysOverdue(utc("2026-08-20"), NOW)).toBe(-4);
  });

  it("porównuje dni, nie chwile — godzina terminu nie ma znaczenia", () => {
    const lateInDay = new Date("2026-08-16T23:59:00.000Z");
    expect(daysOverdue(lateInDay, NOW)).toBe(0);
  });
});

describe("resolveInvoiceStatus", () => {
  it("szkic i anulowana nie zależą od daty", () => {
    expect(resolveInvoiceStatus(invoice({ status: "DRAFT", dueDate: utc("2020-01-01") }), NOW)).toBe("DRAFT");
    expect(resolveInvoiceStatus(invoice({ status: "CANCELLED", dueDate: utc("2020-01-01") }), NOW)).toBe("CANCELLED");
  });

  it("po terminie i bez wpłaty to zaległość", () => {
    expect(resolveInvoiceStatus(invoice({ dueDate: utc("2026-08-10") }), NOW)).toBe("OVERDUE");
  });

  it("termin dzisiaj to jeszcze nie zaległość", () => {
    expect(resolveInvoiceStatus(invoice({ dueDate: utc("2026-08-16") }), NOW)).toBe("DUE_SOON");
  });

  it("termin za mniej niż 7 dni to zbliżający się termin", () => {
    expect(resolveInvoiceStatus(invoice({ dueDate: utc("2026-08-20") }), NOW)).toBe("DUE_SOON");
  });

  it("termin dalej niż 7 dni to faktura nadchodząca", () => {
    expect(resolveInvoiceStatus(invoice({ dueDate: utc("2026-08-31") }), NOW)).toBe("UPCOMING");
  });

  it("pełna wpłata to opłacona, nawet gdy kolumna status tego nie odnotowała", () => {
    const result = resolveInvoiceStatus(
      invoice({ status: "ISSUED", paidGrosze: 240000, dueDate: utc("2026-08-10") }),
      NOW,
    );
    expect(result).toBe("PAID");
  });

  it("nadpłata też liczy się jako opłacona", () => {
    expect(resolveInvoiceStatus(invoice({ paidGrosze: 250000 }), NOW)).toBe("PAID");
  });

  it("wpłata częściowa przed terminem to opłacona częściowo", () => {
    const result = resolveInvoiceStatus(
      invoice({ paidGrosze: 100000, dueDate: utc("2026-08-31") }),
      NOW,
    );
    expect(result).toBe("PARTIALLY_PAID");
  });

  it("zaległość ma pierwszeństwo przed wpłatą częściową", () => {
    // Właściciela interesuje przede wszystkim to, że po terminie brakuje pieniędzy.
    const result = resolveInvoiceStatus(
      invoice({ paidGrosze: 100000, dueDate: utc("2026-08-10") }),
      NOW,
    );
    expect(result).toBe("OVERDUE");
  });

  it("faktura o zerowej kwocie jest od razu opłacona", () => {
    expect(resolveInvoiceStatus(invoice({ totalGrossGrosze: 0, paidGrosze: 0 }), NOW)).toBe("PAID");
  });
});

describe("remainingGrosze", () => {
  it("liczy, ile zostało do zapłaty", () => {
    expect(remainingGrosze(invoice({ paidGrosze: 100000 }))).toBe(140000);
  });

  it("nadpłata nie daje wartości ujemnej", () => {
    expect(remainingGrosze(invoice({ paidGrosze: 250000 }))).toBe(0);
  });
});

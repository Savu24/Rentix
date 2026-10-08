import { describe, expect, it } from "vitest";

import { localeContext } from "@/lib/i18n";
import {
  DRAFT_NUMBER_PREFIX,
  draftInvoiceNumber,
  hasRegisterNumber,
  requiresApproval,
} from "@/lib/invoices/draft";
import { invoicePdfFilename } from "@/lib/invoices/pdf-data";
import { buildBillingPeriod, type BillingLease } from "@/lib/leases/billing";
import { invoiceDraftSchema } from "@/lib/validations/invoice";

/**
 * Czynsz za niepełny miesiąc nie idzie do najemcy od razu — powstaje szkic,
 * który właściciel poprawia i zatwierdza. Patrz `src/lib/invoices/draft.ts`.
 */

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const lease = (overrides: Partial<BillingLease> = {}): BillingLease => ({
  startDate: utc("2026-01-01"),
  endDate: null,
  rentGrosze: 240000,
  utilitiesMode: "FLAT_RATE",
  utilitiesAdvanceGrosze: 45000,
  billingDay: 10,
  paymentTermDays: 10,
  ...overrides,
});

// Październik 2026, miesiąc liczony od zera.
const OCTOBER = [2026, 9] as const;

describe("requiresApproval", () => {
  it("umowa kończąca się 5 października daje szkic za 5 z 31 dni", () => {
    const period = buildBillingPeriod(lease({ endDate: utc("2026-10-05") }), ...OCTOBER)!;

    expect(period.coveredDays).toBe(5);
    expect(period.totalDays).toBe(31);
    expect(requiresApproval(period)).toBe(true);
  });

  it("wprowadzka w połowie miesiąca też czeka na akceptację", () => {
    const period = buildBillingPeriod(lease({ startDate: utc("2026-10-17") }), ...OCTOBER)!;
    expect(requiresApproval(period)).toBe(true);
  });

  it("pełny miesiąc wystawia się od razu", () => {
    const period = buildBillingPeriod(lease(), ...OCTOBER)!;
    expect(requiresApproval(period)).toBe(false);
  });

  it("umowa kończąca się ostatniego dnia miesiąca to wciąż pełny miesiąc", () => {
    const period = buildBillingPeriod(lease({ endDate: utc("2026-10-31") }), ...OCTOBER)!;
    expect(requiresApproval(period)).toBe(false);
  });
});

describe("numer szkicu", () => {
  it("jest unikalny i nie wygląda jak numer z rejestru", () => {
    const a = draftInvoiceNumber();
    const b = draftInvoiceNumber();

    expect(a).not.toBe(b);
    expect(a.startsWith(DRAFT_NUMBER_PREFIX)).toBe(true);
    expect(hasRegisterNumber(a)).toBe(false);
  });

  it("numer z rejestru rozpoznaje jako prawdziwy", () => {
    expect(hasRegisterNumber("R 3/10/2026")).toBe(true);
    expect(hasRegisterNumber("3/10/2026")).toBe(true);
  });

  it("PDF szkicu nie nosi numeru zastępczego w nazwie pliku", () => {
    expect(
      invoicePdfFilename({
        kind: "BILL",
        number: draftInvoiceNumber(),
        organization: { locale: "pl" },
      }),
    ).toBe("rachunek-szkic.pdf");
  });
});

describe("invoiceDraftSchema", () => {
  const C = localeContext("pl");

  const VALID = {
    issueDate: "2026-10-10",
    saleDate: "2026-10-05",
    dueDate: "2026-10-20",
    notes: "",
    lines: [
      {
        description: "Czynsz za październik 2026 (5/31 dni)",
        quantityMilli: "1",
        unit: "mies.",
        unitPriceNetGrosze: "387,10",
        vatRate: "ZW" as const,
      },
      {
        description: "Sprzątanie po wyprowadzce",
        quantityMilli: "1",
        unit: "szt.",
        unitPriceNetGrosze: "150,00",
        vatRate: "ZW" as const,
      },
    ],
  };

  it("przyjmuje poprawione kwoty i dopisaną pozycję", () => {
    const parsed = invoiceDraftSchema(C).parse(VALID);

    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0]!.unitPriceNetGrosze).toBe(38710);
    expect(parsed.lines[1]!.unitPriceNetGrosze).toBe(15000);
    expect(parsed.notes).toBeNull();
  });

  it("odrzuca termin płatności przed datą wystawienia", () => {
    const result = invoiceDraftSchema(C).safeParse({ ...VALID, dueDate: "2026-10-01" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dueDate"]);
  });

  it("nie przepuszcza szkicu bez pozycji", () => {
    expect(invoiceDraftSchema(C).safeParse({ ...VALID, lines: [] }).success).toBe(false);
  });

  it("przyjmuje przesunięty koniec okresu — umowa przedłużona po naliczeniu", () => {
    const parsed = invoiceDraftSchema(C).parse({ ...VALID, periodEnd: "2026-10-31" });

    expect(parsed.periodEnd).toEqual(new Date(Date.UTC(2026, 9, 31)));
  });

  it("nie przyjmuje początku okresu — po nim naliczanie rozpoznaje rozliczony miesiąc", () => {
    const parsed = invoiceDraftSchema(C).parse({ ...VALID, periodStart: "2026-10-05" });

    expect(parsed).not.toHaveProperty("periodStart");
  });
});

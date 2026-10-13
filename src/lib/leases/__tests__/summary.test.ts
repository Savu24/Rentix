import { describe, expect, it } from "vitest";

import { firstBilling, leaseMonthlySummary, leasePeriodProgress } from "@/lib/leases/summary";

const base = {
  startDate: new Date("2026-11-15T00:00:00Z"),
  endDate: null,
  rentGrosze: 300000,
  utilitiesMode: "FLAT_RATE" as const,
  utilitiesAdvanceGrosze: 45000,
  billingDay: 1,
  paymentTermDays: 14,
};

describe("leaseMonthlySummary", () => {
  it("dolicza zaliczkę tylko w trybach, które ją naliczają", () => {
    expect(leaseMonthlySummary(base)).toMatchObject({ totalGrosze: 345000, utilitiesGrosze: 45000 });
    expect(leaseMonthlySummary({ ...base, utilitiesMode: "METERED" })).toMatchObject({
      totalGrosze: 300000,
      utilitiesGrosze: 0,
      rentPercent: 100,
    });
  });

  it("podaje udział czynszu do paska rozbicia", () => {
    expect(leaseMonthlySummary(base).rentPercent).toBe(87);
  });
});

describe("firstBilling", () => {
  it("liczy pierwszy, niepełny miesiąc proporcjonalnie", () => {
    const first = firstBilling(base);
    // 15-30 listopada to 16 z 30 dni.
    expect(first?.prorated).toBe(true);
    expect(first?.period.coveredDays).toBe(16);
    expect(first?.amountGrosze).toBe(160000 + 24000);
    expect(first?.period.issueDate.toISOString().slice(0, 10)).toBe("2026-11-15");
  });

  it("przy „nie naliczaj przed” przeskakuje do pierwszego naliczanego okresu", () => {
    const first = firstBilling({ ...base, billingStartsAt: new Date("2027-01-01T00:00:00Z") });
    expect(first?.prorated).toBe(false);
    expect(first?.amountGrosze).toBe(345000);
    expect(first?.period.periodStart.toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});

describe("leasePeriodProgress", () => {
  it("mierzy upływ i dni do końca", () => {
    const progress = leasePeriodProgress(
      new Date("2025-11-01T00:00:00Z"),
      new Date("2026-10-31T00:00:00Z"),
      new Date("2026-10-12T10:00:00Z"),
    );
    expect(progress?.daysLeft).toBe(19);
    expect(progress?.percent).toBe(95);
  });

  it("dla umowy bezterminowej nie ma czego mierzyć", () => {
    expect(leasePeriodProgress(new Date(), null, new Date())).toBeNull();
  });
});

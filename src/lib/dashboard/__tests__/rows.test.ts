import { describe, expect, it } from "vitest";

import {
  occupancyPercent,
  placeName,
  toExpiringRow,
  toOverdueRow,
  toUpcomingRow,
} from "@/lib/dashboard/rows";

const NOW = new Date("2026-10-12T10:00:00Z");

function invoice(dueDate: string, paidGrosze = 0) {
  return {
    id: "inv",
    number: "R 3/10/2026",
    status: "ISSUED" as const,
    dueDate: new Date(dueDate),
    buyerName: "Zofia Wrzesińska",
    totalGrossGrosze: 165000,
    paidGrosze,
    lease: { property: { name: "Krowoderska 37/12" }, room: { name: "Pokój 1" } },
  };
}

describe("placeName", () => {
  it("dokleja pokój do nazwy nieruchomości", () => {
    expect(placeName({ name: "Dietla 64/3" }, null)).toBe("Dietla 64/3");
    expect(placeName({ name: "Bronowicka 51" }, { name: "Pokój 3" })).toBe("Bronowicka 51, Pokój 3");
    expect(placeName(null, null)).toBeNull();
  });
});

describe("toOverdueRow", () => {
  it("liczy dni po terminie i pozostałą kwotę", () => {
    const row = toOverdueRow(invoice("2026-10-02", 20000), NOW);
    expect(row.daysOverdue).toBe(10);
    expect(row.remainingGrosze).toBe(145000);
    expect(row.place).toBe("Krowoderska 37/12, Pokój 1");
  });
});

describe("toUpcomingRow", () => {
  it("termin w ciągu tygodnia jest pilny, dalszy tylko nadchodzący", () => {
    expect(toUpcomingRow(invoice("2026-10-14"), NOW)).toMatchObject({ daysUntil: 2, tone: "warning" });
    expect(toUpcomingRow(invoice("2026-10-12"), NOW)).toMatchObject({ daysUntil: 0, tone: "warning" });
    expect(toUpcomingRow(invoice("2026-10-19"), NOW)).toMatchObject({ daysUntil: 7, tone: "info" });
  });
});

describe("toExpiringRow", () => {
  const lease = (endDate: string | null) => ({
    id: "lease",
    endDate: endDate ? new Date(endDate) : null,
    property: { name: "Dietla 64/3" },
    room: null,
    tenants: [
      { tenant: { firstName: "Natalia", lastName: "Ostrowska" } },
      { tenant: { firstName: "Bartosz", lastName: "Kmieć" } },
    ],
  });

  it("zwraca umowę w oknie odliczania z najemcami", () => {
    const row = toExpiringRow(lease("2026-10-31"), NOW);
    expect(row?.expiry).toEqual({ days: 19, tone: "warning" });
    expect(row?.tenants).toEqual(["Natalia Ostrowska", "Bartosz Kmieć"]);
  });

  it("pomija umowę bezterminową i odległą", () => {
    expect(toExpiringRow(lease(null), NOW)).toBeNull();
    expect(toExpiringRow(lease("2027-06-30"), NOW)).toBeNull();
  });
});

describe("occupancyPercent", () => {
  it("zaokrągla i nie dzieli przez zero", () => {
    expect(occupancyPercent(12, 14)).toBe(86);
    expect(occupancyPercent(0, 0)).toBe(0);
  });
});

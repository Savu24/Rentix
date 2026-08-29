import { describe, expect, it } from "vitest";

import {
  addMonthsUtc,
  LEASE_EXPIRY_WINDOW_DAYS,
  daysUntilLeaseEnd,
  resolveLeaseExpiry,
} from "@/lib/leases/expiry";

const NOW = new Date("2026-08-20T09:30:00Z");

/** Data końca umowy oddalona o `days` dni od `NOW`. */
function endIn(days: number): Date {
  return new Date(Date.UTC(2026, 7, 20 + days));
}

describe("daysUntilLeaseEnd", () => {
  it("liczy pełne dni do końca umowy", () => {
    expect(daysUntilLeaseEnd(endIn(60), NOW)).toBe(60);
    expect(daysUntilLeaseEnd(endIn(1), NOW)).toBe(1);
  });

  it("umowa kończąca się dziś ma zero dni, także wieczorem", () => {
    expect(daysUntilLeaseEnd(endIn(0), NOW)).toBe(0);
    expect(daysUntilLeaseEnd(endIn(0), new Date("2026-08-20T23:00:00Z"))).toBe(0);
  });

  it("po terminie schodzi poniżej zera", () => {
    expect(daysUntilLeaseEnd(endIn(-3), NOW)).toBe(-3);
  });
});

describe("resolveLeaseExpiry", () => {
  it("odliczanie zaczyna się dokładnie na 60 dni przed końcem", () => {
    expect(resolveLeaseExpiry(endIn(LEASE_EXPIRY_WINDOW_DAYS), NOW)).toMatchObject({ days: 60 });
    expect(resolveLeaseExpiry(endIn(LEASE_EXPIRY_WINDOW_DAYS + 1), NOW)).toBeNull();
  });

  it("licznik maleje z każdym kolejnym dniem", () => {
    const end = endIn(60);
    const days = [0, 1, 2, 30].map(
      (elapsed) => resolveLeaseExpiry(end, new Date(Date.UTC(2026, 7, 20 + elapsed)))?.days,
    );
    expect(days).toEqual([60, 59, 58, 30]);
  });

  it("odmienia dni po polsku", () => {
    expect(resolveLeaseExpiry(endIn(60), NOW)?.label).toBe("60 dni do końca umowy");
    expect(resolveLeaseExpiry(endIn(1), NOW)?.label).toBe("1 dzień do końca umowy");
    expect(resolveLeaseExpiry(endIn(22), NOW)?.label).toBe("22 dni do końca umowy");
  });

  it("ostatni dzień mówi wprost, że to dziś", () => {
    expect(resolveLeaseExpiry(endIn(0), NOW)).toMatchObject({
      days: 0,
      label: "Umowa kończy się dziś",
      tone: "critical",
    });
  });

  it("ton zaostrza się w miarę zbliżania się końca", () => {
    expect(resolveLeaseExpiry(endIn(60), NOW)?.tone).toBe("neutral");
    expect(resolveLeaseExpiry(endIn(31), NOW)?.tone).toBe("neutral");
    expect(resolveLeaseExpiry(endIn(30), NOW)?.tone).toBe("warning");
    expect(resolveLeaseExpiry(endIn(8), NOW)?.tone).toBe("warning");
    expect(resolveLeaseExpiry(endIn(7), NOW)?.tone).toBe("critical");
  });

  it("umowa bezterminowa i już zakończona nie mają licznika", () => {
    expect(resolveLeaseExpiry(null, NOW)).toBeNull();
    expect(resolveLeaseExpiry(endIn(-1), NOW)).toBeNull();
  });
});

describe("addMonthsUtc", () => {
  const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  it("przedłużenie o rok trafia w ten sam dzień", () => {
    expect(iso(addMonthsUtc(utc("2026-10-31"), 12))).toBe("2027-10-31");
  });

  it("przedłużenie o pół roku liczy miesiącami, nie dniami", () => {
    expect(iso(addMonthsUtc(utc("2026-08-15"), 6))).toBe("2027-02-15");
  });

  it("przycina dzień do długości miesiąca docelowego", () => {
    // 31 kwietnia nie istnieje — umowa kończy się ostatniego dnia miesiąca.
    expect(iso(addMonthsUtc(utc("2026-03-31"), 1))).toBe("2026-04-30");
    expect(iso(addMonthsUtc(utc("2026-01-31"), 1))).toBe("2026-02-28");
  });

  it("29 lutego przedłużone o rok cofa się na 28.", () => {
    expect(iso(addMonthsUtc(utc("2028-02-29"), 12))).toBe("2029-02-28");
  });

  it("przechodzi przez koniec roku", () => {
    expect(iso(addMonthsUtc(utc("2026-11-30"), 3))).toBe("2027-02-28");
  });
});

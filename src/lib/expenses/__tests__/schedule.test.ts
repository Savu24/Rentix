import { describe, expect, it } from "vitest";

import { nextOccurrence } from "@/lib/expenses/schedule";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("nextOccurrence", () => {
  it("co tydzień dokłada siedem dni", () => {
    expect(iso(nextOccurrence(utc("2026-08-03"), utc("2026-08-03"), "WEEKLY", null))).toBe(
      "2026-08-10",
    );
  });

  it("co miesiąc trzyma ten sam dzień miesiąca", () => {
    expect(iso(nextOccurrence(utc("2026-01-10"), utc("2026-01-10"), "MONTHLY", null))).toBe(
      "2026-02-10",
    );
  });

  it("przenosi grudzień na styczeń kolejnego roku", () => {
    expect(iso(nextOccurrence(utc("2026-12-05"), utc("2026-12-05"), "MONTHLY", null))).toBe(
      "2027-01-05",
    );
  });

  it("przycina 31. dzień do długości krótszego miesiąca", () => {
    expect(iso(nextOccurrence(utc("2026-01-31"), utc("2026-01-31"), "MONTHLY", null))).toBe(
      "2026-02-28",
    );
  });

  it("po przycięciu wraca do dnia z pierwszej pozycji, zamiast dryfować", () => {
    // Luty przyciął termin do 28., ale marzec ma 31 dni — koszt płacony
    // ostatniego dnia miesiąca nie może zostać na 28. na zawsze.
    const anchor = utc("2026-01-31");
    const february = nextOccurrence(anchor, anchor, "MONTHLY", null);

    expect(iso(nextOccurrence(anchor, february, "MONTHLY", null))).toBe("2026-03-31");
  });

  it("co rok trafia w ten sam dzień kolejnego roku", () => {
    expect(iso(nextOccurrence(utc("2026-04-15"), utc("2026-04-15"), "YEARLY", null))).toBe(
      "2027-04-15",
    );
  });

  it("29 lutego w roku nieprzestępnym cofa się na 28.", () => {
    expect(iso(nextOccurrence(utc("2028-02-29"), utc("2028-02-29"), "YEARLY", null))).toBe(
      "2029-02-28",
    );
  });

  it("niestandardowy cykl liczy odstęp w dniach", () => {
    expect(iso(nextOccurrence(utc("2026-08-01"), utc("2026-08-01"), "CUSTOM", 90))).toBe(
      "2026-10-30",
    );
  });

  it("zawsze idzie do przodu, nawet bez odstępu", () => {
    // Walidacja wymaga liczby dni przy „niestandardowo", ale gdyby kolumna
    // była pusta, pętla naliczania nie może stanąć w miejscu.
    const next = nextOccurrence(utc("2026-08-01"), utc("2026-08-01"), "CUSTOM", null);
    expect(next.getTime()).toBeGreaterThan(utc("2026-08-01").getTime());
  });
});

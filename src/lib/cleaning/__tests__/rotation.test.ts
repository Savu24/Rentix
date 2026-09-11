import { describe, expect, it } from "vitest";

import {
  MAX_CLEANING_RANGE_DAYS,
  addDays,
  isoDay,
  parseIsoDay,
  rangeWeeks,
  rotateDuties,
} from "@/lib/cleaning/rotation";

const day = (iso: string) => parseIsoDay(iso)!;
const range = (from: string, to: string) =>
  rangeWeeks(day(from), day(to)).map((week) => `${isoDay(week.startsOn)}..${isoDay(week.endsOn)}`);

describe("rangeWeeks", () => {
  it("pierwszy tydzień zaczyna się w dniu startu, nie w poniedziałek", () => {
    // 10 lipca 2026 to piątek — tydzień idzie piątek–czwartek.
    expect(range("2026-07-10", "2026-08-06")).toEqual([
      "2026-07-10..2026-07-16",
      "2026-07-17..2026-07-23",
      "2026-07-24..2026-07-30",
      "2026-07-31..2026-08-06",
    ]);
  });

  it("tydzień na styku miesięcy idzie w całości, bez przecinania", () => {
    const weeks = range("2026-07-10", "2026-08-31");
    expect(weeks).toContain("2026-07-31..2026-08-06");
  });

  it("ostatni tydzień jest przycięty do dnia końca", () => {
    expect(range("2026-07-10", "2027-07-31").at(-1)).toBe("2027-07-30..2027-07-31");
  });

  it("tygodnie idą bez dziur i bez zakładek", () => {
    const weeks = rangeWeeks(day("2026-07-10"), day("2027-07-31"));

    for (let i = 1; i < weeks.length; i += 1) {
      const previousEnd = weeks[i - 1].endsOn.getTime();
      expect(weeks[i].startsOn.getTime() - previousEnd).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("rok od 10 lipca do 31 lipca następnego roku to 56 tygodni", () => {
    expect(rangeWeeks(day("2026-07-10"), day("2027-07-31"))).toHaveLength(56);
  });

  it("numeruje tygodnie od jedynki", () => {
    expect(rangeWeeks(day("2026-09-01"), day("2026-09-30")).map((week) => week.index)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("koniec przed początkiem daje pustą listę", () => {
    expect(rangeWeeks(day("2026-09-10"), day("2026-09-01"))).toEqual([]);
  });

  it("jeden dzień to jeden jednodniowy tydzień", () => {
    expect(range("2026-09-01", "2026-09-01")).toEqual(["2026-09-01..2026-09-01"]);
  });
});

describe("rotateDuties", () => {
  const rooms = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("chodzi karuzelą w kolejności uczestników", () => {
    expect(rotateDuties(rooms, 7).map((room) => room.id)).toEqual([
      "a", "b", "c", "a", "b", "c", "a",
    ]);
  });

  it("nikt nie sprząta dwa tygodnie z rzędu", () => {
    const duties = rotateDuties(rooms, 56);

    for (let i = 1; i < duties.length; i += 1) {
      expect(duties[i].id).not.toBe(duties[i - 1].id);
    }
  });

  it("dyżurów każdy dostaje tyle samo z dokładnością do jednego", () => {
    const counts = new Map<string, number>();
    for (const duty of rotateDuties(rooms, 56)) {
      counts.set(duty.id, (counts.get(duty.id) ?? 0) + 1);
    }

    const values = [...counts.values()];
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it("przy jednym uczestniku nie rozdaje niczego", () => {
    expect(rotateDuties([{ id: "a" }], 5)).toEqual([]);
  });
});

describe("parseIsoDay", () => {
  it("czyta dzień kalendarza jako północ UTC", () => {
    expect(parseIsoDay("2026-09-01")?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("odrzuca dni, których nie ma w kalendarzu", () => {
    expect(parseIsoDay("2026-02-31")).toBeNull();
    expect(parseIsoDay("2026-13-01")).toBeNull();
  });

  it("odrzuca zapisy, które nie są dniem", () => {
    expect(parseIsoDay("2026-09")).toBeNull();
    expect(parseIsoDay("01.09.2026")).toBeNull();
    expect(parseIsoDay("")).toBeNull();
  });
});

describe("addDays", () => {
  it("przechodzi przez granicę miesiąca i roku", () => {
    expect(isoDay(addDays(day("2026-12-30"), 3))).toBe("2027-01-02");
  });

  it("limit zakresu obejmuje dwa lata razem z przestępnym", () => {
    expect(MAX_CLEANING_RANGE_DAYS).toBeGreaterThanOrEqual(366 + 365);
  });
});

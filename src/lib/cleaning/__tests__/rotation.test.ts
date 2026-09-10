import { describe, expect, it } from "vitest";

import {
  monthKey,
  monthWeeks,
  parseMonthKey,
  rotateDuties,
} from "@/lib/cleaning/rotation";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const range = (year: number, monthIndex: number) =>
  monthWeeks(year, monthIndex).map((week) => `${iso(week.startsOn)}..${iso(week.endsOn)}`);

/** Losowanie bez losu — kolejność wchodzi do testu taka, jaka wyszła z wejścia. */
const noShuffle = () => 0.999_999;

describe("monthWeeks", () => {
  it("pierwszy tydzień zaczyna się 1. dnia miesiąca, a nie w poprzednim", () => {
    // 1 września 2026 to wtorek — poniedziałek 31 sierpnia należy do sierpnia.
    expect(range(2026, 8)[0]).toBe("2026-09-01..2026-09-06");
  });

  it("ostatni tydzień kończy się ostatnim dniem miesiąca", () => {
    const weeks = range(2026, 8);
    expect(weeks.at(-1)).toBe("2026-09-28..2026-09-30");
  });

  it("tygodnie idą bez dziur i bez zakładek", () => {
    const weeks = monthWeeks(2026, 8);

    for (let i = 1; i < weeks.length; i += 1) {
      const previousEnd = weeks[i - 1].endsOn.getTime();
      expect(weeks[i].startsOn.getTime() - previousEnd).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("miesiąc zaczynający się w poniedziałek daje same pełne tygodnie", () => {
    // Czerwiec 2026: 1. to poniedziałek, 30. wtorek.
    expect(range(2026, 5)).toEqual([
      "2026-06-01..2026-06-07",
      "2026-06-08..2026-06-14",
      "2026-06-15..2026-06-21",
      "2026-06-22..2026-06-28",
      "2026-06-29..2026-06-30",
    ]);
  });

  it("miesiąc zaczynający się w niedzielę otwiera jednodniowym tygodniem", () => {
    // Luty 2026 zaczyna się w niedzielę — pierwszy „tydzień" to sam 1 lutego.
    expect(range(2026, 1)[0]).toBe("2026-02-01..2026-02-01");
  });

  it("luty roku przestępnego kończy się 29.", () => {
    expect(range(2028, 1).at(-1)).toBe("2028-02-28..2028-02-29");
  });

  it("numeruje tygodnie od jedynki", () => {
    expect(monthWeeks(2026, 8).map((week) => week.index)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("rotateDuties", () => {
  const rooms = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("nikt nie sprząta dwa tygodnie z rzędu", () => {
    const duties = rotateDuties(rooms, 12, { random: Math.random });

    for (let i = 1; i < duties.length; i += 1) {
      expect(duties[i].id).not.toBe(duties[i - 1].id);
    }
  });

  it("nie powtarza sprzątającego z ostatniego tygodnia poprzedniego miesiąca", () => {
    // Bez tego reguła pękałaby dokładnie na styku miesięcy, gdzie nikt jej
    // nie sprawdza — a tam widać ją najlepiej, bo tabelki wiszą obok siebie.
    for (const previousId of ["a", "b", "c"]) {
      const duties = rotateDuties(rooms, 5, { previousId, random: Math.random });
      expect(duties[0].id).not.toBe(previousId);
    }
  });

  it("nie powtarza sprzątającego z pierwszego tygodnia kolejnego miesiąca", () => {
    // Miesiąc wygenerowany po raz drugi ma pasować także do tego, co wisi już
    // po jego prawej stronie.
    for (const nextId of ["a", "b", "c"]) {
      const duties = rotateDuties(rooms, 5, { nextId, random: Math.random });
      expect(duties.at(-1)!.id).not.toBe(nextId);
    }
  });

  it("gdy obu styków nie da się pogodzić, wygrywa miesiąc poprzedni", () => {
    // Dwoje sprzątających i parzysta liczba tygodni: pierwszy i ostatni dyżur
    // są wtedy różne z definicji, więc „a" po obu stronach nie ma rozwiązania.
    // Styk widoczny wcześniej jest ważniejszy.
    const duties = rotateDuties([{ id: "a" }, { id: "b" }], 4, {
      previousId: "a",
      nextId: "a",
      random: Math.random,
    });

    expect(duties.map((duty) => duty.id)).toEqual(["b", "a", "b", "a"]);
  });

  it("rozdaje dyżury równo, z dokładnością do jednego", () => {
    const duties = rotateDuties(rooms, 9, { random: noShuffle });
    const counts = rooms.map((room) => duties.filter((duty) => duty.id === room.id).length);

    expect(counts).toEqual([3, 3, 3]);
  });

  it("chodzi karuzelą, więc kolejność wraca co pełny obrót", () => {
    const duties = rotateDuties(rooms, 5, { random: noShuffle });
    expect(duties.map((duty) => duty.id)).toEqual(["a", "b", "c", "a", "b"]);
  });

  it("przy dwóch sprzątających naprzemiennie", () => {
    const duties = rotateDuties([{ id: "a" }, { id: "b" }], 4, { random: noShuffle });
    expect(duties.map((duty) => duty.id)).toEqual(["a", "b", "a", "b"]);
  });

  it("jeden sprzątający nie daje harmonogramu", () => {
    expect(rotateDuties([{ id: "a" }], 4)).toEqual([]);
  });

  it("zero tygodni nie daje dyżurów", () => {
    expect(rotateDuties(rooms, 0)).toEqual([]);
  });
});

describe("parseMonthKey", () => {
  it("czyta klucz miesiąca", () => {
    expect(parseMonthKey("2026-09")).toEqual({ year: 2026, monthIndex: 8 });
  });

  it("odrzuca miesiąc spoza kalendarza i śmieci", () => {
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-00")).toBeNull();
    expect(parseMonthKey("2026-9")).toBeNull();
    expect(parseMonthKey("wrzesień")).toBeNull();
  });
});

describe("monthKey", () => {
  it("dopełnia miesiąc zerem", () => {
    expect(monthKey(2026, 0)).toBe("2026-01");
  });

  it("przenosi rok przy miesiącu spoza zakresu", () => {
    expect(monthKey(2026, 12)).toBe("2027-01");
    expect(monthKey(2026, -1)).toBe("2025-12");
  });
});

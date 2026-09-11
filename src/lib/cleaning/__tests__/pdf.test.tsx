// @vitest-environment node

import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import {
  CleaningScheduleDocument,
  calendarMonths,
  cleaningPdfFilename,
  type CleaningPdfData,
} from "@/lib/cleaning/pdf";
import { isoDay, parseIsoDay, rangeWeeks, rotateDuties } from "@/lib/cleaning/rotation";
import type { CleaningDutyView } from "@/lib/cleaning/service";

/**
 * Wydruk harmonogramu.
 *
 * Złożonego PDF-a nie da się odczytać z bufora, więc sprawdzamy trzy rzeczy,
 * które psują się po cichu: układ kalendarza (siatkę dni i podpisy liczymy
 * osobno, przed rysowaniem), nazwę pliku i to, że dokument w ogóle się
 * renderuje — osadzanie fontu czyta pliki z dysku i wywraca się dopiero
 * w czasie działania.
 */

/** Rozpiska jak na wzorcowej kartce: cztery pokoje, od piątku 10 lipca na rok. */
function yearSchedule(): CleaningDutyView[] {
  const rooms = ["1 (balkon)", "2", "3", "4"].map((label) => ({ id: label, label }));
  const weeks = rangeWeeks(parseIsoDay("2026-07-10")!, parseIsoDay("2027-07-31")!);
  const assigned = rotateDuties(rooms, weeks.length);

  return weeks.map((week, index) => ({
    index: week.index,
    startsOn: isoDay(week.startsOn),
    endsOn: isoDay(week.endsOn),
    label: assigned[index].label,
    roomId: assigned[index].id,
    tenantId: null,
  }));
}

const DATA: CleaningPdfData = {
  locale: "pl",
  propertyName: "Mieszkanie Długa 14/3",
  propertyAddress: "Bolesławicka 22/129, 03-352 Warszawa",
  organizationName: "Kowalski Nieruchomości",
  range: { from: "2026-07-10", to: "2027-07-31" },
  duties: yearSchedule(),
};

describe("calendarMonths", () => {
  const months = calendarMonths(DATA.duties, DATA.range);
  const rows = (index: number) =>
    months[index].rows.map((row) => [row.days.map((day) => day ?? "").join(" ").trim(), row.label]);

  it("rozkłada rok od lipca do lipca na trzynaście miesięcy", () => {
    expect(months).toHaveLength(13);
    expect(months[0]).toMatchObject({ year: 2026, monthIndex: 6 });
    expect(months.at(-1)).toMatchObject({ year: 2027, monthIndex: 6 });
  });

  it("lipiec zaczyna się od dnia startu i kończy urwanym tygodniem", () => {
    expect(rows(0)).toEqual([
      ["10 11 12 13 14 15 16", "1 (balkon)"],
      ["17 18 19 20 21 22 23", "2"],
      ["24 25 26 27 28 29 30", "3"],
      ["31", "4"],
    ]);
  });

  it("tydzień na styku stoi w obu miesiącach z tym samym podpisem", () => {
    // Lipiec kończy się „31 → 4", sierpień zaczyna „1 2 3 4 5 6 → 4":
    // ten sam tydzień, w każdym miesiącu tylko jego dni.
    expect(rows(1)[0]).toEqual(["1 2 3 4 5 6", "4"]);
    expect(months[1].rows[0].days).toEqual([null, 1, 2, 3, 4, 5, 6]);
  });

  it("ostatni tydzień nie udaje pełnego — kratki po końcu zostają puste", () => {
    const last = months.at(-1)!.rows.at(-1)!;
    expect(last.days).toEqual([30, 31, null, null, null, null, null]);
    expect(last.label).toBe("4");
  });

  it("styczeń wchodzi w środku karuzeli, bez resetu na nowy rok", () => {
    // Grudzień kończy się na „1 (balkon)", więc styczeń otwiera „2".
    expect(rows(6)[0]).toEqual(["1 2 3 4 5 6 7", "2"]);
  });

  it("zakres bez dyżurów daje same puste miesiące", () => {
    const empty = calendarMonths([], { from: "2026-09-01", to: "2026-10-31" });
    expect(empty.map((month) => month.rows.length)).toEqual([0, 0]);
  });
});

describe("cleaningPdfFilename", () => {
  it("niesie rodzaj dokumentu, lokal i dzień startu", () => {
    expect(cleaningPdfFilename(DATA)).toBe(
      "harmonogram-sprzatania-mieszkanie-dluga-14-3-2026-07-10.pdf",
    );
  });

  it("zostawia datę czytelną przy długiej nazwie lokalu", () => {
    const filename = cleaningPdfFilename({
      ...DATA,
      propertyName: "Kamienica przy alei Niepodległości 137 lokal 12",
    });

    // Przycinanie długiej nazwy nie może zjeść końcówki — po niej rozróżnia
    // się dwa wydruki tego samego mieszkania.
    expect(filename.endsWith("-2026-07-10.pdf")).toBe(true);
  });

  it("bierze nazwę dokumentu z języka konta", () => {
    expect(cleaningPdfFilename({ ...DATA, locale: "uk" })).toBe(
      "cleaning-rota-mieszkanie-dluga-14-3-2026-07-10.pdf",
    );
  });
});

describe("CleaningScheduleDocument", () => {
  it("renderuje cały rok do pliku PDF", async () => {
    const buffer = await renderToBuffer(CleaningScheduleDocument({ data: DATA }));

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  }, 20_000);

  it("renderuje rozpiskę po najemcach z długimi nazwiskami", async () => {
    const duties = DATA.duties.map((duty) => ({
      ...duty,
      roomId: null,
      tenantId: duty.roomId,
      label: duty.label === "2" ? "Aleksandra Wiśniewska-Nowak" : `Jan ${duty.label}`,
    }));
    const buffer = await renderToBuffer(CleaningScheduleDocument({ data: { ...DATA, duties } }));

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 20_000);
});

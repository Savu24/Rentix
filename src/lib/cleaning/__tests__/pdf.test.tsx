// @vitest-environment node

import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import {
  CleaningScheduleDocument,
  cleaningPdfFilename,
  type CleaningPdfData,
} from "@/lib/cleaning/pdf";

/**
 * Wydruk harmonogramu.
 *
 * Złożonego PDF-a nie da się odczytać z bufora, więc sprawdzamy dwie rzeczy,
 * które psują się po cichu: nazwę pliku (jedyne, co użytkownik widzi
 * w folderze pobranych) i to, że dokument w ogóle się renderuje — osadzanie
 * fontu czyta pliki z dysku i wywraca się dopiero w czasie działania.
 */

const DATA: CleaningPdfData = {
  locale: "pl",
  propertyName: "Mieszkanie Długa 14/3",
  propertyAddress: "Długa 14/3, 30-001 Kraków",
  organizationName: "Kowalski Nieruchomości",
  month: { year: 2026, monthIndex: 8 },
  byTenants: false,
  duties: [
    {
      index: 1,
      startsOn: "2026-09-01",
      endsOn: "2026-09-06",
      label: "Pokój 1",
      roomId: "room-1",
      tenantId: null,
    },
    {
      index: 2,
      startsOn: "2026-09-07",
      endsOn: "2026-09-13",
      label: "Pokój 2",
      roomId: "room-2",
      tenantId: null,
    },
  ],
};

describe("cleaningPdfFilename", () => {
  it("niesie rodzaj dokumentu, lokal i miesiąc", () => {
    expect(cleaningPdfFilename(DATA)).toBe(
      "harmonogram-sprzatania-mieszkanie-dluga-14-3-2026-09.pdf",
    );
  });

  it("zostawia miesiąc czytelny przy długiej nazwie lokalu", () => {
    const filename = cleaningPdfFilename({
      ...DATA,
      propertyName: "Kamienica przy alei Niepodległości 137 lokal 12",
    });

    // Przycinanie długiej nazwy nie może zjeść końcówki — po niej rozróżnia
    // się dwa wydruki tego samego mieszkania.
    expect(filename.endsWith("-2026-09.pdf")).toBe(true);
  });

  it("bierze nazwę dokumentu z języka konta", () => {
    expect(cleaningPdfFilename({ ...DATA, locale: "uk" })).toBe(
      "cleaning-rota-mieszkanie-dluga-14-3-2026-09.pdf",
    );
  });
});

describe("CleaningScheduleDocument", () => {
  it("renderuje się do pliku PDF", async () => {
    const buffer = await renderToBuffer(CleaningScheduleDocument({ data: DATA }));

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  }, 20_000);
});

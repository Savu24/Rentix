import { describe, expect, it } from "vitest";

import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";

describe("pluralize", () => {
  it("wybiera polską formę zależnie od liczby", () => {
    const forms = ["pokój", "pokoje", "pokoi"];
    expect(pluralize("pl", 1, forms)).toBe("pokój");
    expect(pluralize("pl", 4, forms)).toBe("pokoje");
    expect(pluralize("pl", 5, forms)).toBe("pokoi");
    // Nastki biorą dopełniacz, mimo że kończą się na 2–4.
    expect(pluralize("pl", 12, forms)).toBe("pokoi");
    expect(pluralize("pl", 22, forms)).toBe("pokoje");
    expect(pluralize("pl", 0, forms)).toBe("pokoi");
  });

  it("po angielsku wystarczają dwie formy", () => {
    const forms = ["room", "rooms"];
    expect(pluralize("uk", 1, forms)).toBe("room");
    expect(pluralize("uk", 0, forms)).toBe("rooms");
    expect(pluralize("uk", 12, forms)).toBe("rooms");
  });
});

describe("formatDateIn", () => {
  const date = new Date(2026, 8, 5); // 5 września 2026

  it("zapisuje datę po polsku i po brytyjsku", () => {
    expect(formatDateIn(date, "pl", "long")).toBe("5 września 2026");
    expect(formatDateIn(date, "uk", "long")).toBe("5 September 2026");
  });

  it("w zapisie cyfrowym obie wersje mają dzień przed miesiącem", () => {
    expect(formatDateIn(date, "pl", "numeric")).toBe("05.09.2026");
    expect(formatDateIn(date, "uk", "numeric")).toBe("05/09/2026");
  });
});

describe("fill", () => {
  it("wstawia wartości w dziury", () => {
    expect(fill("Zostało {count} dni", { count: 3 })).toBe("Zostało 3 dni");
  });

  it("zostawia dziurę, dla której nie podano wartości", () => {
    // Lepiej widoczne „{count}" niż ciche „undefined" w zdaniu.
    expect(fill("Zostało {count} dni", {})).toBe("Zostało {count} dni");
  });
});

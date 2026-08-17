import { describe, expect, it } from "vitest";

import { UtilitiesMode } from "@/generated/prisma/enums";
import {
  UTILITIES_MODE_HINT,
  UTILITIES_MODE_INCOMPLETE,
  UTILITIES_MODE_LABEL,
} from "@/lib/validations/lease";

const modes = Object.values(UtilitiesMode);

describe("tryby rozliczania mediów", () => {
  it("każdy tryb ma etykietę i podpowiedź", () => {
    // Tryb bez etykiety wypadłby z listy wyboru, choć dalej istniałby w bazie.
    for (const mode of modes) {
      expect(UTILITIES_MODE_LABEL[mode]).toBeTruthy();
      expect(UTILITIES_MODE_HINT[mode]).toBeTruthy();
    }
  });

  it("tryby zależne od odczytów liczników są oznaczone jako niepełne", () => {
    // Bez tego ostrzeżenia rozliczenie w trybie METERED wychodzi z samym
    // czynszem — wygląda poprawnie i jest zaniżone, więc nikt tego nie łapie.
    expect(UTILITIES_MODE_INCOMPLETE.METERED).toBeTruthy();
    expect(UTILITIES_MODE_INCOMPLETE.MIXED).toBeTruthy();
  });

  it("tryby w pełni obsłużone nie straszą ostrzeżeniem", () => {
    expect(UTILITIES_MODE_INCOMPLETE.INCLUDED).toBeUndefined();
    expect(UTILITIES_MODE_INCOMPLETE.FLAT_RATE).toBeUndefined();
  });

  it("nie oznacza trybu, którego nie ma w enumie", () => {
    for (const key of Object.keys(UTILITIES_MODE_INCOMPLETE)) {
      expect(modes).toContain(key);
    }
  });
});

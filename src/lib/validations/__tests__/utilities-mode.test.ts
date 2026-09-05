import { describe, expect, it } from "vitest";

import { UtilitiesMode } from "@/generated/prisma/enums";
import {
  utilitiesModeHints,
  utilitiesModeIncomplete,
  utilitiesModeLabels,
} from "@/lib/validations/lease";

import { localeContext } from "@/lib/i18n";

/*
  Schematy są fabrykami zależnymi od kraju, więc test podaje im kontekst wprost.
  Sprawdzamy na wersji polskiej — reguły brytyjskie mają własne przypadki.
*/
const C = localeContext("pl");
const D = C.d;

const modes = Object.values(UtilitiesMode);

describe("tryby rozliczania mediów", () => {
  it("każdy tryb ma etykietę i podpowiedź", () => {
    // Tryb bez etykiety wypadłby z listy wyboru, choć dalej istniałby w bazie.
    for (const mode of modes) {
      expect(utilitiesModeLabels(D)[mode]).toBeTruthy();
      expect(utilitiesModeHints(D)[mode]).toBeTruthy();
    }
  });

  it("tryby zależne od odczytów liczników są oznaczone jako niepełne", () => {
    // Bez tego ostrzeżenia rozliczenie w trybie METERED wychodzi z samym
    // czynszem — wygląda poprawnie i jest zaniżone, więc nikt tego nie łapie.
    expect(utilitiesModeIncomplete(D).METERED).toBeTruthy();
    expect(utilitiesModeIncomplete(D).MIXED).toBeTruthy();
  });

  it("tryby w pełni obsłużone nie straszą ostrzeżeniem", () => {
    expect(utilitiesModeIncomplete(D).INCLUDED).toBeUndefined();
    expect(utilitiesModeIncomplete(D).FLAT_RATE).toBeUndefined();
  });

  it("nie oznacza trybu, którego nie ma w enumie", () => {
    for (const key of Object.keys(utilitiesModeIncomplete(D))) {
      expect(modes).toContain(key);
    }
  });
});

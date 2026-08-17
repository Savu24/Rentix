import { describe, expect, it } from "vitest";

import {
  MAX_ROOMS_PER_PROPERTY,
  propertyCreateSchema,
  propertyFormSchema,
  propertyListQuerySchema,
  roomFormSchema,
  roomsBulkUpdateSchema,
} from "@/lib/validations/property";

const VALID_PROPERTY = {
  name: "Kwiatowa 4",
  type: "APARTMENT" as const,
  street: "Kwiatowa",
  buildingNumber: "4",
  postalCode: "30-001",
  city: "Kraków",
};

describe("propertyFormSchema", () => {
  it("przyjmuje komplet wymaganych pól", () => {
    const result = propertyFormSchema.parse(VALID_PROPERTY);
    expect(result.name).toBe("Kwiatowa 4");
    expect(result.publiclyListed).toBe(false);
  });

  it("przycina białe znaki", () => {
    const result = propertyFormSchema.parse({ ...VALID_PROPERTY, name: "  Kwiatowa 4  " });
    expect(result.name).toBe("Kwiatowa 4");
  });

  it("zamienia puste pola opcjonalne na null, a nie pusty string", () => {
    // Pusty string w bazie udawałby wypełnioną wartość i psuł warunki `IS NULL`.
    const result = propertyFormSchema.parse({ ...VALID_PROPERTY, district: "", notes: "  " });
    expect(result.district).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("wymaga kodu pocztowego w formacie 00-000", () => {
    for (const bad of ["30001", "3-001", "30-01", "abc"]) {
      expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, postalCode: bad }).success).toBe(false);
    }
    expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, postalCode: "30-001" }).success).toBe(true);
  });

  it("odrzuca pustą nazwę i nieznany typ", () => {
    expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, name: "   " }).success).toBe(false);
    expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, type: "CASTLE" }).success).toBe(false);
  });

  it("komunikat o brakującym polu uzgadnia rodzaj z każdą etykietą", () => {
    // „Nazwa jest wymagane” było błędem gramatycznym — konstrukcja „Pole …”
    // jest nijaka i pasuje zarówno do „Nazwa”, jak i do „Numer budynku”.
    const result = propertyFormSchema.safeParse({ ...VALID_PROPERTY, name: "", buildingNumber: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Pole „Nazwa” jest wymagane");
      expect(messages).toContain("Pole „Numer budynku” jest wymagane");
    }
  });

  it("wskazuje pole, które jest błędne", () => {
    const result = propertyFormSchema.safeParse({ ...VALID_PROPERTY, city: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["city"]);
  });
});

describe("propertyFormSchema — metraż i czynsz", () => {
  it("czyta czynsz w polskim zapisie i zwraca grosze", () => {
    const result = propertyFormSchema.parse({ ...VALID_PROPERTY, askingRentGrosze: "2 400,50" });
    expect(result.askingRentGrosze).toBe(240050);
  });

  it("odrzuca czynsz, który nie jest kwotą", () => {
    expect(
      propertyFormSchema.safeParse({ ...VALID_PROPERTY, askingRentGrosze: "dużo" }).success,
    ).toBe(false);
  });

  it("czyta powierzchnię z przecinkiem i zwraca string dla kolumny Decimal", () => {
    // String, nie Float — inaczej Prisma dostałaby wartość po konwersji binarnej.
    expect(propertyFormSchema.parse({ ...VALID_PROPERTY, areaM2: "48,5" }).areaM2).toBe("48.50");
  });

  it("odrzuca powierzchnię wyglądającą na literówkę", () => {
    // "48500" zamiast "48,50" — bez górnej granicy przeszłoby bez słowa.
    expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, areaM2: "48500" }).success).toBe(false);
  });

  it("odrzuca powierzchnię ujemną", () => {
    expect(propertyFormSchema.safeParse({ ...VALID_PROPERTY, areaM2: "-10" }).success).toBe(false);
  });

  it("przyjmuje piętro ujemne (suterena)", () => {
    expect(propertyFormSchema.parse({ ...VALID_PROPERTY, floor: "-1" }).floor).toBe(-1);
  });

  it("puste piętro daje null, a nie zero", () => {
    // Parter to piętro 0 — konkretna informacja. Brak informacji to null.
    expect(propertyFormSchema.parse({ ...VALID_PROPERTY, floor: "" }).floor).toBeNull();
    expect(propertyFormSchema.parse({ ...VALID_PROPERTY, floor: "0" }).floor).toBe(0);
  });
});

describe("roomFormSchema", () => {
  it("wystarczy oznaczenie pokoju", () => {
    const result = roomFormSchema.parse({ name: "Pokój 1" });
    expect(result.name).toBe("Pokój 1");
    expect(result.status).toBe("AVAILABLE");
  });

  it("czyta czynsz za pokój w polskim zapisie", () => {
    expect(roomFormSchema.parse({ name: "1", monthlyRentGrosze: "900,00" }).monthlyRentGrosze).toBe(
      90000,
    );
  });

  it("nie ma pola powierzchni — przy pokoju nikt jej nie rozlicza", () => {
    const result = roomFormSchema.parse({ name: "1" });
    expect("areaM2" in result).toBe(false);
  });

  it("odrzuca pustą nazwę", () => {
    expect(roomFormSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

describe("propertyCreateSchema — liczba pokoi", () => {
  it("liczba pokoi decyduje, ile pokoi powstanie", () => {
    expect(propertyCreateSchema.parse({ ...VALID_PROPERTY, roomCount: "3" }).roomCount).toBe(3);
  });

  it("brak liczby pokoi to zero, a nie null", () => {
    // Serwis tworzy dokładnie tyle pokoi, ile wynosi ta liczba — `null`
    // wywróciłby `Array.from({ length })`.
    expect(propertyCreateSchema.parse({ ...VALID_PROPERTY }).roomCount).toBe(0);
    expect(propertyCreateSchema.parse({ ...VALID_PROPERTY, roomCount: "" }).roomCount).toBe(0);
  });

  it("odrzuca liczbę ujemną i ułamkową", () => {
    expect(propertyCreateSchema.safeParse({ ...VALID_PROPERTY, roomCount: "-1" }).success).toBe(false);
    expect(propertyCreateSchema.safeParse({ ...VALID_PROPERTY, roomCount: "2,5" }).success).toBe(false);
  });

  it("odrzuca liczbę powyżej limitu — łapie literówkę typu 300 zamiast 3", () => {
    expect(
      propertyCreateSchema.safeParse({ ...VALID_PROPERTY, roomCount: String(MAX_ROOMS_PER_PROPERTY + 1) })
        .success,
    ).toBe(false);
    expect(
      propertyCreateSchema.safeParse({ ...VALID_PROPERTY, roomCount: String(MAX_ROOMS_PER_PROPERTY) })
        .success,
    ).toBe(true);
  });
});

describe("roomsBulkUpdateSchema", () => {
  it("przyjmuje komplet pokoi z cenami", () => {
    const result = roomsBulkUpdateSchema.parse({
      rooms: [
        { id: "r1", name: "Pokój 1", monthlyRentGrosze: "900,00" },
        { id: "r2", name: "Pokój 2", monthlyRentGrosze: "" },
      ],
    });
    expect(result.rooms[0]!.monthlyRentGrosze).toBe(90000);
  });

  it("odrzuca pustą listę", () => {
    expect(roomsBulkUpdateSchema.safeParse({ rooms: [] }).success).toBe(false);
  });

  it("odrzuca pokój bez nazwy", () => {
    expect(
      roomsBulkUpdateSchema.safeParse({ rooms: [{ id: "r1", name: "  " }] }).success,
    ).toBe(false);
  });
});

describe("propertyListQuerySchema", () => {
  it("bez parametrów daje wartości domyślne", () => {
    const result = propertyListQuerySchema.parse({});
    expect(result.occupancy).toBe("all");
    expect(result.includeArchived).toBe(false);
  });

  it("czyta includeArchived z query stringa jako tekst", () => {
    expect(propertyListQuerySchema.parse({ includeArchived: "true" }).includeArchived).toBe(true);
    expect(propertyListQuerySchema.parse({ includeArchived: "false" }).includeArchived).toBe(false);
  });

  it("odrzuca nieznaną wartość filtra dostępności", () => {
    expect(propertyListQuerySchema.safeParse({ occupancy: "maybe" }).success).toBe(false);
  });
});

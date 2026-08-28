import { describe, expect, it } from "vitest";

import { leaseFormSchema, leaseUpdateSchema } from "@/lib/validations/lease";
import { tenantFormSchema } from "@/lib/validations/tenant";

const VALID_LEASE = {
  propertyId: "property_1",
  tenantIds: ["tenant_1"],
  startDate: "2026-09-01",
  rentGrosze: "2 400,00",
  utilitiesMode: "FLAT_RATE" as const,
  utilitiesAdvanceGrosze: "450,00",
};

describe("leaseFormSchema", () => {
  it("przyjmuje poprawną umowę i przelicza kwoty na grosze", () => {
    const result = leaseFormSchema.parse(VALID_LEASE);
    expect(result.rentGrosze).toBe(240000);
    expect(result.utilitiesAdvanceGrosze).toBe(45000);
    expect(result.depositGrosze).toBe(0);
    expect(result.billingDay).toBe(1);
    expect(result.paymentTermDays).toBe(10);
  });

  it("pusta kaucja to zero, nie błąd walidacji", () => {
    // Formularz wysyła "" gdy pole zostało puste — `moneyInput` sam
    // odrzucałby to jako „nie jest kwotą".
    expect(leaseFormSchema.parse({ ...VALID_LEASE, depositGrosze: "" }).depositGrosze).toBe(0);
  });

  it("bez pokoju umowa dotyczy całej nieruchomości", () => {
    expect(leaseFormSchema.parse(VALID_LEASE).roomId).toBeNull();
    expect(leaseFormSchema.parse({ ...VALID_LEASE, roomId: "" }).roomId).toBeNull();
    expect(leaseFormSchema.parse({ ...VALID_LEASE, roomId: "room_1" }).roomId).toBe("room_1");
  });

  it("wymaga wskazania nieruchomości", () => {
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, propertyId: "" }).success).toBe(false);
  });

  it("buduje daty w UTC, niezależnie od strefy serwera", () => {
    const result = leaseFormSchema.parse(VALID_LEASE);
    expect(result.startDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("puste „nie naliczaj przed” to brak odcięcia, nie błąd", () => {
    expect(leaseFormSchema.parse(VALID_LEASE).billingStartsAt).toBeNull();
    expect(leaseFormSchema.parse({ ...VALID_LEASE, billingStartsAt: "" }).billingStartsAt).toBeNull();
  });

  it("odcięcie naliczania trafia do UTC tak samo jak pozostałe daty", () => {
    const result = leaseFormSchema.parse({ ...VALID_LEASE, billingStartsAt: "2026-09-01" });
    expect(result.billingStartsAt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("puste pole daty końcowej daje umowę bezterminową", () => {
    expect(leaseFormSchema.parse({ ...VALID_LEASE, endDate: "" }).endDate).toBeNull();
  });

  it("odrzuca datę zakończenia wcześniejszą niż rozpoczęcia", () => {
    const result = leaseFormSchema.safeParse({
      ...VALID_LEASE,
      startDate: "2026-09-01",
      endDate: "2026-08-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["endDate"]);
  });

  it("dopuszcza umowę jednodniową", () => {
    const result = leaseFormSchema.safeParse({
      ...VALID_LEASE,
      startDate: "2026-09-01",
      endDate: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("odrzuca datę, która nie istnieje", () => {
    // Date po cichu przesunąłby 31 lutego na marzec — łapiemy to wcześniej.
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, startDate: "2026-02-31" }).success).toBe(false);
  });

  it("odrzuca datę w złym formacie", () => {
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, startDate: "01.09.2026" }).success).toBe(false);
  });

  it("wymaga zaliczki, gdy tryb mediów jej oczekuje", () => {
    for (const mode of ["FLAT_RATE", "MIXED"] as const) {
      const result = leaseFormSchema.safeParse({
        ...VALID_LEASE,
        utilitiesMode: mode,
        utilitiesAdvanceGrosze: "0",
      });
      expect(result.success).toBe(false);
    }
  });

  it("nie wymaga zaliczki w trybie INCLUDED ani METERED", () => {
    for (const mode of ["INCLUDED", "METERED"] as const) {
      const result = leaseFormSchema.safeParse({
        ...VALID_LEASE,
        utilitiesMode: mode,
        utilitiesAdvanceGrosze: "0",
      });
      expect(result.success).toBe(true);
    }
  });

  it("wymaga przynajmniej jednego najemcy", () => {
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, tenantIds: [] }).success).toBe(false);
  });

  it("odrzuca tego samego najemcę wskazanego dwa razy", () => {
    const result = leaseFormSchema.safeParse({
      ...VALID_LEASE,
      tenantIds: ["tenant_1", "tenant_1"],
    });
    expect(result.success).toBe(false);
  });

  it("ogranicza dzień naliczania do 28", () => {
    // 29–31 wymagałoby wyjątku dla lutego przy każdym naliczeniu.
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, billingDay: 29 }).success).toBe(false);
    expect(leaseFormSchema.safeParse({ ...VALID_LEASE, billingDay: 28 }).success).toBe(true);
  });

  /**
   * Schemat NIE jest idempotentny: jego wynik nie nadaje się na własne wejście.
   * Formularze muszą więc wysyłać do API surowe wartości pól, a nie to, co
   * zwrócił `zodResolver` — inaczej API odrzuca datę i podwaja rząd wielkości
   * kwoty. Ten test pilnuje, żeby ktoś nie „uprościł" tego z powrotem.
   */
  it("wyniku walidacji nie wolno wysyłać ponownie do API", () => {
    const parsed = leaseFormSchema.parse(VALID_LEASE);
    const overTheWire = JSON.parse(JSON.stringify(parsed)) as unknown;

    const again = leaseFormSchema.safeParse(overTheWire);
    expect(again.success).toBe(false);
    if (!again.success) {
      expect(again.error.issues.map((issue) => issue.path[0])).toContain("startDate");
    }
  });
});

describe("leaseUpdateSchema", () => {
  it("pozwala zmienić pojedyncze pole", () => {
    const result = leaseUpdateSchema.parse({ rentGrosze: "2 600,00" });
    expect(result.rentGrosze).toBe(260000);
  });

  it("pustym polem czyści odcięcie naliczania, a pominiętym go nie rusza", () => {
    // Rozróżnienie jest istotne: PATCH z jednym polem nie może po cichu
    // skasować daty, której formularz w ogóle nie przysłał.
    expect(leaseUpdateSchema.parse({ billingStartsAt: "" }).billingStartsAt).toBeNull();
    expect(leaseUpdateSchema.parse({ rentGrosze: "2 600,00" }).billingStartsAt).toBeUndefined();
    expect(
      leaseUpdateSchema.parse({ billingStartsAt: "2026-09-01" }).billingStartsAt?.toISOString(),
    ).toBe("2026-09-01T00:00:00.000Z");
  });

  it("nie sprawdza spójności dat, gdy przyszła tylko jedna", () => {
    expect(leaseUpdateSchema.safeParse({ endDate: "2026-01-01" }).success).toBe(true);
  });

  it("sprawdza spójność, gdy przyszły obie daty", () => {
    const result = leaseUpdateSchema.safeParse({
      startDate: "2026-09-01",
      endDate: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("tenantFormSchema", () => {
  const VALID = { firstName: "Jan", lastName: "Kowalski" };

  it("wystarczy imię i nazwisko", () => {
    const result = tenantFormSchema.parse(VALID);
    expect(result.status).toBe("PROSPECT");
    // Pominięte pole zostaje `undefined`, nie `null` — przy PATCH-u oznacza to
    // „nie zmieniaj", a `null` oznaczałoby „wyczyść". To rozróżnienie jest istotne.
    expect(result.email).toBeUndefined();
  });

  it("odróżnia pole pominięte od jawnie wyczyszczonego", () => {
    const cleared = tenantFormSchema.parse({ ...VALID, email: "", phone: "" });
    expect(cleared.email).toBeNull();
    expect(cleared.phone).toBeNull();
  });

  it("normalizuje e-mail do małych liter i przycina spacje", () => {
    const result = tenantFormSchema.parse({ ...VALID, email: "  JAN@Przyklad.PL " });
    expect(result.email).toBe("jan@przyklad.pl");
  });

  it("czyści NIP ze spacji i myślników", () => {
    expect(tenantFormSchema.parse({ ...VALID, taxId: "123-456-32-18" }).taxId).toBe("1234563218");
  });

  it("odrzuca NIP o złej długości", () => {
    expect(tenantFormSchema.safeParse({ ...VALID, taxId: "12345" }).success).toBe(false);
  });

  it("odrzuca niepoprawny e-mail, ale akceptuje jego brak", () => {
    expect(tenantFormSchema.safeParse({ ...VALID, email: "to-nie-email" }).success).toBe(false);
    expect(tenantFormSchema.safeParse({ ...VALID, email: "" }).success).toBe(true);
  });

  it("przyjmuje polskie formaty telefonu", () => {
    for (const phone of ["+48 601 100 200", "601100200", "(12) 345-67-89"]) {
      expect(tenantFormSchema.safeParse({ ...VALID, phone }).success).toBe(true);
    }
  });
});

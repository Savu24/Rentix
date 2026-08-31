import { describe, expect, it } from "vitest";

import { tenantFormSchema } from "@/lib/validations/tenant";

const VALID = { firstName: "Jan", lastName: "Kowalski" };

describe("tenantFormSchema — dokumenty tożsamości", () => {
  it("wystarczą imię i nazwisko", () => {
    // Kartotekę zakłada się często po samym telefonie, zanim ktokolwiek
    // cokolwiek okazał — wymóg dokumentu kończyłby się notatką w telefonie.
    const result = tenantFormSchema.parse(VALID);
    expect(result.idCardNumber).toBeUndefined();
    expect(result.pesel).toBeUndefined();
    expect(result.passportNumber).toBeUndefined();
  });

  it("puste pola dają null, nie błąd", () => {
    const result = tenantFormSchema.parse({
      ...VALID,
      idCardNumber: "",
      pesel: "",
      passportNumber: "",
      emergencyContactFirstName: "",
      emergencyContactPhone: "",
    });

    expect(result.idCardNumber).toBeNull();
    expect(result.pesel).toBeNull();
    expect(result.passportNumber).toBeNull();
    expect(result.emergencyContactFirstName).toBeNull();
    expect(result.emergencyContactPhone).toBeNull();
  });

  it("normalizuje numer dowodu przepisany z dokumentu", () => {
    expect(tenantFormSchema.parse({ ...VALID, idCardNumber: "abc 123456" }).idCardNumber).toBe(
      "ABC123456",
    );
  });

  it("odrzuca numer dowodu w złym formacie", () => {
    expect(tenantFormSchema.safeParse({ ...VALID, idCardNumber: "AB123456" }).success).toBe(false);
    expect(tenantFormSchema.safeParse({ ...VALID, idCardNumber: "ABC12345" }).success).toBe(false);
  });

  it("czyści PESEL ze spacji i myślników", () => {
    expect(tenantFormSchema.parse({ ...VALID, pesel: "90 010 112 345" }).pesel).toBe("90010112345");
  });

  it("odrzuca PESEL o złej długości i z literami", () => {
    expect(tenantFormSchema.safeParse({ ...VALID, pesel: "9001011234" }).success).toBe(false);
    expect(tenantFormSchema.safeParse({ ...VALID, pesel: "9001011234A" }).success).toBe(false);
  });

  it("przyjmuje kartę pobytu w dowolnym formacie", () => {
    // Numery kart bywają różne, a najemca przepisuje je z dokumentu — pole
    // jest zwykłym tekstem, bez narzuconego wzoru.
    expect(
      tenantFormSchema.parse({ ...VALID, residenceCardNumber: "abc 1234567" })
        .residenceCardNumber,
    ).toBe("abc 1234567");
    expect(
      tenantFormSchema.safeParse({ ...VALID, residenceCardNumber: "ABC123456" }).success,
    ).toBe(true);
  });

  it("przyjmuje zagraniczny numer paszportu", () => {
    // Każde państwo numeruje po swojemu — sprawdzamy tylko, że to numer,
    // a nie zdanie wpisane w złe pole.
    expect(tenantFormSchema.parse({ ...VALID, passportNumber: "ze1234567" }).passportNumber).toBe(
      "ZE1234567",
    );
    expect(tenantFormSchema.safeParse({ ...VALID, passportNumber: "brak paszportu" }).success).toBe(
      false,
    );
  });
});

describe("tenantFormSchema — kontakt na wypadek nagłego zdarzenia", () => {
  it("zapisuje imię, nazwisko i telefon", () => {
    const result = tenantFormSchema.parse({
      ...VALID,
      emergencyContactFirstName: "Anna",
      emergencyContactLastName: "Kowalska",
      emergencyContactPhone: "+48 601 100 200",
    });

    expect(result.emergencyContactFirstName).toBe("Anna");
    expect(result.emergencyContactLastName).toBe("Kowalska");
    expect(result.emergencyContactPhone).toBe("+48 601 100 200");
  });

  it("nie wymaga kompletu — sam telefon też jest czymś", () => {
    // W nagłym wypadku liczy się numer; nazwisko osoby, która odbierze,
    // bywa dopisywane później albo wcale.
    const result = tenantFormSchema.parse({ ...VALID, emergencyContactPhone: "601100200" });
    expect(result.emergencyContactPhone).toBe("601100200");
    expect(result.emergencyContactLastName).toBeUndefined();
  });

  it("sprawdza format telefonu awaryjnego tak samo jak telefonu najemcy", () => {
    expect(
      tenantFormSchema.safeParse({ ...VALID, emergencyContactPhone: "zadzwoń do siostry" }).success,
    ).toBe(false);
  });

  it("zapisuje e-mail kontaktu awaryjnego i puste pole zamienia na null", () => {
    expect(
      tenantFormSchema.parse({ ...VALID, emergencyContactEmail: "anna@przyklad.pl" })
        .emergencyContactEmail,
    ).toBe("anna@przyklad.pl");
    expect(
      tenantFormSchema.parse({ ...VALID, emergencyContactEmail: "" }).emergencyContactEmail,
    ).toBeNull();
  });

  it("odrzuca e-mail awaryjny w złym formacie", () => {
    expect(
      tenantFormSchema.safeParse({ ...VALID, emergencyContactEmail: "anna(at)przyklad" }).success,
    ).toBe(false);
  });
});

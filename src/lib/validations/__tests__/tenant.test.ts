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

describe("tenantFormSchema — szczegóły najemcy", () => {
  it("domyślnie najemca jest osobą fizyczną", () => {
    // Kartoteki zakładane do tej pory nie miały tego pola — muszą wpaść
    // w przypadek, który był dla nich prawdziwy.
    expect(tenantFormSchema.parse(VALID).legalForm).toBe("INDIVIDUAL");
    expect(tenantFormSchema.parse({ ...VALID, legalForm: "COMPANY" }).legalForm).toBe("COMPANY");
  });

  it("trzyma adres zameldowania osobno od adresu do faktury", () => {
    // To dwa różne adresy: jeden idzie na dokument, drugi do umowy najmu
    // okazjonalnego — pomylenie ich kosztowałoby ważność umowy.
    const result = tenantFormSchema.parse({
      ...VALID,
      street: "Kwiatowa 4",
      city: "Kraków",
      registeredStreet: "Leśna 12/3",
      registeredPostalCode: "03-133",
      registeredCity: "Warszawa",
    });

    expect(result.street).toBe("Kwiatowa 4");
    expect(result.registeredStreet).toBe("Leśna 12/3");
    expect(result.registeredCity).toBe("Warszawa");
  });

  it("puste zameldowanie do znaczy bezterminowe", () => {
    expect(tenantFormSchema.parse({ ...VALID, registeredUntil: "" }).registeredUntil).toBeNull();
    expect(
      tenantFormSchema.parse({ ...VALID, registeredUntil: "2027-01-31" }).registeredUntil,
    ).toEqual(new Date("2027-01-31T00:00:00.000Z"));
  });

  it("sprawdza kod pocztowy zameldowania tym samym wzorem co pozostałe", () => {
    expect(
      tenantFormSchema.safeParse({ ...VALID, registeredPostalCode: "03133" }).success,
    ).toBe(false);
  });

  it("czyści rachunek do zwrotu kaucji ze spacji i prefiksu PL", () => {
    expect(
      tenantFormSchema.parse({
        ...VALID,
        depositRefundAccount: "PL 12 3456 7890 1234 5678 9012 3456",
      }).depositRefundAccount,
    ).toBe("12345678901234567890123456");

    expect(
      tenantFormSchema.safeParse({ ...VALID, depositRefundAccount: "1234" }).success,
    ).toBe(false);
  });

  it("kontakt do płatności sprawdza tak samo jak podstawowy", () => {
    expect(tenantFormSchema.parse({ ...VALID, billingEmail: "" }).billingEmail).toBeNull();
    expect(tenantFormSchema.safeParse({ ...VALID, billingPhone: "zapytaj mamę" }).success).toBe(
      false,
    );
  });

  it("praca i polisa są opcjonalne, a ich daty puste znaczą brak terminu", () => {
    const result = tenantFormSchema.parse({
      ...VALID,
      employerName: "Uniwersytet Warszawski",
      employmentUntil: "",
      insurancePolicyNumber: "POL/2026/1234",
      insuranceExpiresAt: "2027-06-30",
    });

    expect(result.employerName).toBe("Uniwersytet Warszawski");
    expect(result.employmentUntil).toBeNull();
    expect(result.insurancePolicyNumber).toBe("POL/2026/1234");
    expect(result.insuranceExpiresAt).toEqual(new Date("2027-06-30T00:00:00.000Z"));
  });

  it("odrzuca datę urodzenia, której nie ma w kalendarzu", () => {
    expect(tenantFormSchema.safeParse({ ...VALID, dateOfBirth: "1990-02-31" }).success).toBe(false);
  });
});

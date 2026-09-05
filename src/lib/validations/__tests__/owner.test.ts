import { describe, expect, it } from "vitest";

import { formatBankAccount } from "@/lib/bank-account";
import { formatContractPeriod, ownerFormSchema, ownerUpdateSchema } from "@/lib/validations/owner";

import { localeContext } from "@/lib/i18n";

/*
  Schematy są fabrykami zależnymi od kraju, więc test podaje im kontekst wprost.
  Sprawdzamy na wersji polskiej — reguły brytyjskie mają własne przypadki.
*/
const C = localeContext("pl");

const VALID = { name: "Anna Nowak" };
const ACCOUNT = "12345678901234567890123456";

describe("ownerFormSchema", () => {
  it("wystarczy sama nazwa", () => {
    // Numer rachunku i NIP dostaje się zwykle dopiero przy pierwszym
    // rozliczeniu — formularz, którego bez nich nie da się zapisać, kończy się
    // notatką w telefonie zamiast wpisem w systemie.
    const result = ownerFormSchema(C).parse(VALID);
    expect(result.name).toBe("Anna Nowak");
    expect(result.bankAccount).toBeUndefined();
  });

  it("wymaga nazwy", () => {
    expect(ownerFormSchema(C).safeParse({ name: "   " }).success).toBe(false);
  });

  it("przyjmuje nazwę firmy tak samo jak osobę", () => {
    expect(ownerFormSchema(C).parse({ name: "Nowak Nieruchomości sp. z o.o." }).name).toBe(
      "Nowak Nieruchomości sp. z o.o.",
    );
  });
});

describe("numer rachunku", () => {
  it("czyści spacje z numeru przepisanego z umowy", () => {
    const spaced = "12 3456 7890 1234 5678 9012 3456";
    expect(ownerFormSchema(C).parse({ ...VALID, bankAccount: spaced }).bankAccount).toBe(ACCOUNT);
  });

  it("akceptuje prefiks PL", () => {
    expect(ownerFormSchema(C).parse({ ...VALID, bankAccount: `PL${ACCOUNT}` }).bankAccount).toBe(
      ACCOUNT,
    );
  });

  it("odrzuca numer o złej długości", () => {
    expect(ownerFormSchema(C).safeParse({ ...VALID, bankAccount: "123456" }).success).toBe(false);
    expect(ownerFormSchema(C).safeParse({ ...VALID, bankAccount: `${ACCOUNT}7` }).success).toBe(false);
  });

  it("odrzuca numer z literami w środku", () => {
    expect(
      ownerFormSchema(C).safeParse({ ...VALID, bankAccount: "12 3456 ABCD 1234 5678 9012 3456" })
        .success,
    ).toBe(false);
  });

  it("puste pole daje null, nie błąd", () => {
    expect(ownerFormSchema(C).parse({ ...VALID, bankAccount: "" }).bankAccount).toBeNull();
  });
});

describe("formatBankAccount", () => {
  it("rozbija numer na grupy jak na przelewie", () => {
    expect(formatBankAccount(ACCOUNT)).toBe("12 3456 7890 1234 5678 9012 3456");
  });

  it("nie psuje wartości o nietypowej długości", () => {
    // Rekordy z importu bywają krótsze; lepiej pokazać je surowo niż pociąć
    // w grupy sugerujące poprawny numer.
    expect(formatBankAccount("12345")).toBe("12345");
  });
});

describe("okres umowy o zarządzanie", () => {
  it("zapisuje obie daty jako północ UTC", () => {
    const result = ownerFormSchema(C).parse({
      ...VALID,
      contractStartDate: "2026-09-01",
      contractEndDate: "2027-08-31",
    });

    expect(result.contractStartDate?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(result.contractEndDate?.toISOString()).toBe("2027-08-31T00:00:00.000Z");
  });

  it("puste daty dają null, nie błąd", () => {
    // Właściciela wpisuje się często zanim umowa zostanie podpisana.
    const result = ownerFormSchema(C).parse({ ...VALID, contractStartDate: "", contractEndDate: "" });
    expect(result.contractStartDate).toBeNull();
    expect(result.contractEndDate).toBeNull();
  });

  it("sam początek znaczy czas nieokreślony", () => {
    const result = ownerFormSchema(C).parse({ ...VALID, contractStartDate: "2026-09-01" });
    expect(result.contractEndDate).toBeNull();
  });

  it("odrzuca koniec wcześniejszy niż początek", () => {
    const result = ownerFormSchema(C).safeParse({
      ...VALID,
      contractStartDate: "2026-09-01",
      contractEndDate: "2026-08-31",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["contractEndDate"]);
  });

  it("dopuszcza umowę jednodniową", () => {
    expect(
      ownerFormSchema(C).safeParse({
        ...VALID,
        contractStartDate: "2026-09-01",
        contractEndDate: "2026-09-01",
      }).success,
    ).toBe(true);
  });

  it("PATCH z samym telefonem nie wymaga przysyłania dat", () => {
    // `.partial()` na kształcie, nie na gotowym schemacie — inaczej sprawdzenie
    // kolejności dat wywracałoby każdą częściową aktualizację.
    expect(ownerUpdateSchema(C).safeParse({ phone: "601100200" }).success).toBe(true);
  });
});

describe("formatContractPeriod", () => {
  const start = new Date("2026-09-01T00:00:00.000Z");
  const end = new Date("2027-08-31T00:00:00.000Z");

  it("składa zakres z obu dat", () => {
    expect(formatContractPeriod(start, end, C)).toBe("1 wrz 2026 – 31 sie 2027");
  });

  it("sam początek opisuje jako czas nieokreślony", () => {
    expect(formatContractPeriod(start, null, C)).toBe("od 1 wrz 2026, czas nieokreślony");
  });

  it("bez dat nie ma czego pokazać", () => {
    expect(formatContractPeriod(null, null, C)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { formatBankAccount, ownerFormSchema } from "@/lib/validations/owner";

const VALID = { name: "Anna Nowak" };
const ACCOUNT = "12345678901234567890123456";

describe("ownerFormSchema", () => {
  it("wystarczy sama nazwa", () => {
    // Numer rachunku i NIP dostaje się zwykle dopiero przy pierwszym
    // rozliczeniu — formularz, którego bez nich nie da się zapisać, kończy się
    // notatką w telefonie zamiast wpisem w systemie.
    const result = ownerFormSchema.parse(VALID);
    expect(result.name).toBe("Anna Nowak");
    expect(result.bankAccount).toBeUndefined();
  });

  it("wymaga nazwy", () => {
    expect(ownerFormSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("przyjmuje nazwę firmy tak samo jak osobę", () => {
    expect(ownerFormSchema.parse({ name: "Nowak Nieruchomości sp. z o.o." }).name).toBe(
      "Nowak Nieruchomości sp. z o.o.",
    );
  });
});

describe("numer rachunku", () => {
  it("czyści spacje z numeru przepisanego z umowy", () => {
    const spaced = "12 3456 7890 1234 5678 9012 3456";
    expect(ownerFormSchema.parse({ ...VALID, bankAccount: spaced }).bankAccount).toBe(ACCOUNT);
  });

  it("akceptuje prefiks PL", () => {
    expect(ownerFormSchema.parse({ ...VALID, bankAccount: `PL${ACCOUNT}` }).bankAccount).toBe(
      ACCOUNT,
    );
  });

  it("odrzuca numer o złej długości", () => {
    expect(ownerFormSchema.safeParse({ ...VALID, bankAccount: "123456" }).success).toBe(false);
    expect(ownerFormSchema.safeParse({ ...VALID, bankAccount: `${ACCOUNT}7` }).success).toBe(false);
  });

  it("odrzuca numer z literami w środku", () => {
    expect(
      ownerFormSchema.safeParse({ ...VALID, bankAccount: "12 3456 ABCD 1234 5678 9012 3456" })
        .success,
    ).toBe(false);
  });

  it("puste pole daje null, nie błąd", () => {
    expect(ownerFormSchema.parse({ ...VALID, bankAccount: "" }).bankAccount).toBeNull();
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

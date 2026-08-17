import { describe, expect, it } from "vitest";

import { isSellerComplete } from "@/lib/organizations/seller";
import {
  ACCOUNT_DELETE_PHRASE,
  accountDeleteSchema,
  organizationSettingsSchema,
  passwordChangeSchema,
  profileSettingsSchema,
} from "@/lib/validations/settings";

describe("organizationSettingsSchema", () => {
  const VALID = { name: "Kowalski Nieruchomości" };

  it("wystarczy sama nazwa", () => {
    // Organizacja powstaje przy rejestracji z samą nazwą, więc formularz musi
    // dać się zapisać, zanim właściciel uzupełni resztę.
    const result = organizationSettingsSchema.parse(VALID);
    expect(result.name).toBe("Kowalski Nieruchomości");
    expect(result.street).toBeUndefined();
  });

  it("wymaga nazwy", () => {
    expect(organizationSettingsSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("czyści NIP ze spacji i myślników", () => {
    expect(organizationSettingsSchema.parse({ ...VALID, taxId: "123-456-32-18" }).taxId).toBe(
      "1234563218",
    );
  });

  it("odrzuca NIP o złej długości, ale akceptuje jego brak", () => {
    expect(organizationSettingsSchema.safeParse({ ...VALID, taxId: "12345" }).success).toBe(false);
    expect(organizationSettingsSchema.parse({ ...VALID, taxId: "" }).taxId).toBeNull();
  });

  it("pilnuje formatu kodu pocztowego", () => {
    expect(organizationSettingsSchema.safeParse({ ...VALID, postalCode: "30001" }).success).toBe(
      false,
    );
    expect(organizationSettingsSchema.parse({ ...VALID, postalCode: "30-001" }).postalCode).toBe(
      "30-001",
    );
    expect(organizationSettingsSchema.parse({ ...VALID, postalCode: "" }).postalCode).toBeNull();
  });
});

describe("isSellerComplete", () => {
  const FULL = {
    name: "Kowalski Nieruchomości",
    taxId: "1234563218",
    street: "Długa 14/3",
    postalCode: "30-001",
    city: "Kraków",
  };

  it("komplet adresu wystarcza", () => {
    expect(isSellerComplete(FULL)).toBe(true);
  });

  it("brak NIP-u nie jest brakiem", () => {
    // Osoba fizyczna wynajmująca prywatnie NIP-u nie ma — ostrzeżenie o nim
    // byłoby ostrzeżeniem, którego nie da się wyłączyć.
    expect(isSellerComplete({ ...FULL, taxId: null })).toBe(true);
  });

  it("brak którejkolwiek części adresu psuje dokument", () => {
    expect(isSellerComplete({ ...FULL, street: null })).toBe(false);
    expect(isSellerComplete({ ...FULL, postalCode: null })).toBe(false);
    expect(isSellerComplete({ ...FULL, city: null })).toBe(false);
  });

  it("same spacje to nadal brak", () => {
    expect(isSellerComplete({ ...FULL, city: "   " })).toBe(false);
  });
});

describe("profileSettingsSchema", () => {
  it("wymaga imienia i nazwiska", () => {
    expect(profileSettingsSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("telefon jest opcjonalny, puste pole daje null", () => {
    expect(profileSettingsSchema.parse({ name: "Jan Kowalski", phone: "" }).phone).toBeNull();
    expect(profileSettingsSchema.parse({ name: "Jan Kowalski", phone: "+48 601 100 200" }).phone).toBe(
      "+48 601 100 200",
    );
  });

  it("nie przyjmuje e-maila — to osobny przepływ", () => {
    const result = profileSettingsSchema.parse({
      name: "Jan Kowalski",
      email: "nowy@przyklad.pl",
    } as never);

    expect(result).not.toHaveProperty("email");
  });
});

describe("accountDeleteSchema", () => {
  it("przyjmuje hasło i dokładnie przepisaną frazę", () => {
    const result = accountDeleteSchema.safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: ACCOUNT_DELETE_PHRASE,
    });
    expect(result.success).toBe(true);
  });

  it("odrzuca frazę o innej wielkości liter", () => {
    // Fraza ma być przepisana, a nie „mniej więcej trafiona" — to jedyna
    // bariera między odruchowym kliknięciem a utratą wszystkich danych.
    const result = accountDeleteSchema.safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: "usuwam konto",
    });
    expect(result.success).toBe(false);
  });

  it("wybacza spacje na brzegach", () => {
    const result = accountDeleteSchema.safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: `  ${ACCOUNT_DELETE_PHRASE} `,
    });
    expect(result.success).toBe(true);
  });

  it("wymaga hasła, nie tylko frazy", () => {
    const result = accountDeleteSchema.safeParse({
      currentPassword: "",
      confirmation: ACCOUNT_DELETE_PHRASE,
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("przyjmuje poprawną zmianę", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "StareHaslo1",
      newPassword: "NoweHaslo123",
    });
    expect(result.success).toBe(true);
  });

  it("wymaga obecnego hasła", () => {
    expect(
      passwordChangeSchema.safeParse({ currentPassword: "", newPassword: "NoweHaslo123" }).success,
    ).toBe(false);
  });

  it("nowe hasło przechodzi przez reguły złożoności", () => {
    expect(
      passwordChangeSchema.safeParse({ currentPassword: "StareHaslo1", newPassword: "krotkie" })
        .success,
    ).toBe(false);
  });

  it("odrzuca nowe hasło identyczne z obecnym", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "NoweHaslo123",
      newPassword: "NoweHaslo123",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["newPassword"]);
  });
});

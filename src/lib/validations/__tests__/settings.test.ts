import { describe, expect, it } from "vitest";

import { isSellerComplete } from "@/lib/organizations/seller";
import {
  accountDeletePhrase,
  accountDeleteSchema,
  MAX_LOGO_BYTES,
  organizationLogoSchema,
  organizationSettingsSchema,
  passwordChangeSchema,
  profileSettingsSchema,
} from "@/lib/validations/settings";

import { localeContext } from "@/lib/i18n";

/*
  Schematy są fabrykami zależnymi od kraju, więc test podaje im kontekst wprost.
  Sprawdzamy na wersji polskiej — reguły brytyjskie mają własne przypadki.
*/
const C = localeContext("pl");

describe("organizationSettingsSchema", () => {
  const VALID = { name: "Kowalski Nieruchomości" };

  it("wystarczy sama nazwa", () => {
    // Organizacja powstaje przy rejestracji z samą nazwą, więc formularz musi
    // dać się zapisać, zanim właściciel uzupełni resztę.
    const result = organizationSettingsSchema(C).parse(VALID);
    expect(result.name).toBe("Kowalski Nieruchomości");
    expect(result.street).toBeUndefined();
  });

  it("wymaga nazwy", () => {
    expect(organizationSettingsSchema(C).safeParse({ name: "   " }).success).toBe(false);
  });

  it("czyści NIP ze spacji i myślników", () => {
    expect(organizationSettingsSchema(C).parse({ ...VALID, taxId: "123-456-32-18" }).taxId).toBe(
      "1234563218",
    );
  });

  it("odrzuca NIP o złej długości, ale akceptuje jego brak", () => {
    expect(organizationSettingsSchema(C).safeParse({ ...VALID, taxId: "12345" }).success).toBe(false);
    expect(organizationSettingsSchema(C).parse({ ...VALID, taxId: "" }).taxId).toBeNull();
  });

  it("normalizuje numer rachunku dla najemców", () => {
    // Ten sam numer ludzie wklejają w grupach i z prefiksem — w bazie ma leżeć
    // w jednym zapisie, bo trafia wprost na dokument.
    const account = "12345678901234567890123456";
    expect(
      organizationSettingsSchema(C).parse({ ...VALID, bankAccount: "PL12 3456 7890 1234 5678 9012 3456" })
        .bankAccount,
    ).toBe(account);
    expect(organizationSettingsSchema(C).parse({ ...VALID, bankAccount: "" }).bankAccount).toBeNull();
    expect(
      organizationSettingsSchema(C).safeParse({ ...VALID, bankAccount: "1234" }).success,
    ).toBe(false);
  });

  it("pilnuje formatu kodu pocztowego", () => {
    expect(organizationSettingsSchema(C).safeParse({ ...VALID, postalCode: "30001" }).success).toBe(
      false,
    );
    expect(organizationSettingsSchema(C).parse({ ...VALID, postalCode: "30-001" }).postalCode).toBe(
      "30-001",
    );
    expect(organizationSettingsSchema(C).parse({ ...VALID, postalCode: "" }).postalCode).toBeNull();
  });
});

describe("organizationLogoSchema", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

  it("przyjmuje PNG i bierze typ z samego data URI", () => {
    // Typ podany osobno przez klienta mógłby się rozjechać z zawartością,
    // a rozjazd wyszedłby dopiero przy renderowaniu PDF-a.
    const result = organizationLogoSchema(C).parse({ dataUrl: PNG });
    expect(result.dataUrl.mimeType).toBe("image/png");
    expect(result.dataUrl.dataUrl).toBe(PNG);
  });

  it("przyjmuje JPEG", () => {
    const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
    expect(organizationLogoSchema(C).parse({ dataUrl: jpeg }).dataUrl.mimeType).toBe("image/jpeg");
  });

  it("odrzuca SVG i WebP", () => {
    // Renderer PDF-a ich nie rysuje — przepuszczone zniknęłyby z dokumentu
    // po cichu, a to gorsze niż odmowa przy wgrywaniu.
    expect(
      organizationLogoSchema(C).safeParse({ dataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" })
        .success,
    ).toBe(false);
    expect(
      organizationLogoSchema(C).safeParse({ dataUrl: "data:image/webp;base64,UklGRg==" }).success,
    ).toBe(false);
  });

  it("odrzuca adres URL zamiast obrazka", () => {
    expect(
      organizationLogoSchema(C).safeParse({ dataUrl: "https://przyklad.pl/logo.png" }).success,
    ).toBe(false);
  });

  it("odrzuca obrazek powyżej limitu", () => {
    // 4 znaki base64 = 3 bajty, więc tyle znaków przekracza limit o włos.
    const oversized = `data:image/png;base64,${"A".repeat(Math.ceil((MAX_LOGO_BYTES + 1) * 4 / 3))}`;
    expect(organizationLogoSchema(C).safeParse({ dataUrl: oversized }).success).toBe(false);
  });

  it("przepuszcza obrazek tuż pod limitem", () => {
    const justUnder = `data:image/png;base64,${"A".repeat(Math.floor((MAX_LOGO_BYTES - 3) * 4 / 3))}`;
    expect(organizationLogoSchema(C).safeParse({ dataUrl: justUnder }).success).toBe(true);
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
    expect(profileSettingsSchema(C).safeParse({ name: "" }).success).toBe(false);
  });

  it("telefon jest opcjonalny, puste pole daje null", () => {
    expect(profileSettingsSchema(C).parse({ name: "Jan Kowalski", phone: "" }).phone).toBeNull();
    expect(profileSettingsSchema(C).parse({ name: "Jan Kowalski", phone: "+48 601 100 200" }).phone).toBe(
      "+48 601 100 200",
    );
  });

  it("nie przyjmuje e-maila — to osobny przepływ", () => {
    const result = profileSettingsSchema(C).parse({
      name: "Jan Kowalski",
      email: "nowy@przyklad.pl",
    } as never);

    expect(result).not.toHaveProperty("email");
  });
});

describe("accountDeleteSchema", () => {
  it("przyjmuje hasło i dokładnie przepisaną frazę", () => {
    const result = accountDeleteSchema(C).safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: accountDeletePhrase(C),
    });
    expect(result.success).toBe(true);
  });

  it("odrzuca frazę o innej wielkości liter", () => {
    // Fraza ma być przepisana, a nie „mniej więcej trafiona" — to jedyna
    // bariera między odruchowym kliknięciem a utratą wszystkich danych.
    const result = accountDeleteSchema(C).safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: "usuwam konto",
    });
    expect(result.success).toBe(false);
  });

  it("wybacza spacje na brzegach", () => {
    const result = accountDeleteSchema(C).safeParse({
      currentPassword: "MojeHaslo1",
      confirmation: `  ${accountDeletePhrase(C)} `,
    });
    expect(result.success).toBe(true);
  });

  it("wymaga hasła, nie tylko frazy", () => {
    const result = accountDeleteSchema(C).safeParse({
      currentPassword: "",
      confirmation: accountDeletePhrase(C),
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("przyjmuje poprawną zmianę", () => {
    const result = passwordChangeSchema(C).safeParse({
      currentPassword: "StareHaslo1",
      newPassword: "NoweHaslo123",
    });
    expect(result.success).toBe(true);
  });

  it("wymaga obecnego hasła", () => {
    expect(
      passwordChangeSchema(C).safeParse({ currentPassword: "", newPassword: "NoweHaslo123" }).success,
    ).toBe(false);
  });

  it("nowe hasło przechodzi przez reguły złożoności", () => {
    expect(
      passwordChangeSchema(C).safeParse({ currentPassword: "StareHaslo1", newPassword: "krotkie" })
        .success,
    ).toBe(false);
  });

  it("odrzuca nowe hasło identyczne z obecnym", () => {
    const result = passwordChangeSchema(C).safeParse({
      currentPassword: "NoweHaslo123",
      newPassword: "NoweHaslo123",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["newPassword"]);
  });
});

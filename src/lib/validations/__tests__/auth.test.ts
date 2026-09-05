import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/validations/auth";

// Komunikaty wchodzą do schematów z zewnątrz — testujemy na polskich.
const MESSAGES = getDictionary("pl").auth.validation;

const VALID = {
  name: "Aleksandra Kowal",
  organizationName: "Kowal Nieruchomości",
  email: "aleksandra@przyklad.pl",
  password: "BezpieczneHaslo1",
};

describe("passwordSchema", () => {
  it("przyjmuje hasło spełniające wszystkie reguły", () => {
    expect(passwordSchema(MESSAGES).safeParse("BezpieczneHaslo1").success).toBe(true);
  });

  it.each([
    ["za krótkie", "Krotkie1"],
    ["bez wielkiej litery", "bezpiecznehaslo1"],
    ["bez małej litery", "BEZPIECZNEHASLO1"],
    ["bez cyfry", "BezpieczneHaslo"],
  ])("odrzuca hasło %s", (_label, password) => {
    expect(passwordSchema(MESSAGES).safeParse(password).success).toBe(false);
  });

  it("uznaje polskie znaki za litery", () => {
    expect(passwordSchema(MESSAGES).safeParse("Zażółćgęślą1").success).toBe(true);
  });

  it("odrzuca hasło dłuższe niż 128 znaków", () => {
    expect(passwordSchema(MESSAGES).safeParse(`A1${"a".repeat(200)}`).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalizuje e-mail do małych liter i przycina spacje", () => {
    const result = registerSchema(MESSAGES).parse({ ...VALID, email: "  Aleksandra@Przyklad.PL " });
    expect(result.email).toBe("aleksandra@przyklad.pl");
  });

  it("przycina białe znaki z imienia i nazwy firmy", () => {
    const result = registerSchema(MESSAGES).parse({
      ...VALID,
      name: "  Aleksandra Kowal  ",
      organizationName: "  Kowal Nieruchomości ",
    });
    expect(result.name).toBe("Aleksandra Kowal");
    expect(result.organizationName).toBe("Kowal Nieruchomości");
  });

  it("odrzuca niepoprawny adres e-mail", () => {
    const result = registerSchema(MESSAGES).safeParse({ ...VALID, email: "to-nie-jest-email" });
    expect(result.success).toBe(false);
  });

  it("wskazuje pole, które jest błędne", () => {
    const result = registerSchema(MESSAGES).safeParse({ ...VALID, password: "slabe" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["password"]);
    }
  });

  it("odrzuca puste imię", () => {
    expect(registerSchema(MESSAGES).safeParse({ ...VALID, name: " " }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("nie wymusza reguł złożoności — konto mogło powstać przy innych regułach", () => {
    const result = loginSchema(MESSAGES).safeParse({ email: VALID.email, password: "stare" });
    expect(result.success).toBe(true);
  });

  it("wymaga niepustego hasła", () => {
    expect(loginSchema(MESSAGES).safeParse({ email: VALID.email, password: "" }).success).toBe(false);
  });

  it("normalizuje e-mail tak samo jak rejestracja", () => {
    // Bez tego logowanie „Jan@Przyklad.pl" nie znalazłoby konta zapisanego
    // jako „jan@przyklad.pl".
    const result = loginSchema(MESSAGES).parse({ email: " Jan@Przyklad.pl ", password: "x" });
    expect(result.email).toBe("jan@przyklad.pl");
  });
});

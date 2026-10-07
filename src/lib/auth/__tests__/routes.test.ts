import { describe, expect, it } from "vitest";

import {
  isGuestOnlyPath,
  isProtectedPath,
  landingPathForRole,
  publicRoutes,
  ROUTES,
  safeReturnPath,
} from "@/lib/auth/routes";

describe("isProtectedPath", () => {
  it("chroni panel właściciela i najemcy wraz z podstronami", () => {
    expect(isProtectedPath("/panel")).toBe(true);
    expect(isProtectedPath("/panel/nieruchomosci/123")).toBe(true);
    expect(isProtectedPath("/najemca")).toBe(true);
    expect(isProtectedPath("/najemca/platnosci")).toBe(true);
  });

  it("nie chroni części publicznej", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/pl/logowanie")).toBe(false);
    expect(isProtectedPath("/uk/login")).toBe(false);
    expect(isProtectedPath("/cennik")).toBe(false);
  });

  it("nie daje się nabrać na ścieżkę zaczynającą się tym samym prefiksem", () => {
    // "/panelowanie" nie jest podstroną "/panel" i nie powinno być chronione
    // tą regułą — inaczej dowolna publiczna strona na "panel*" znikałaby za loginem.
    expect(isProtectedPath("/panelowanie")).toBe(false);
    expect(isProtectedPath("/najemcy-opinie")).toBe(false);
  });
});

describe("isGuestOnlyPath", () => {
  it("rozpoznaje logowanie i rejestrację", () => {
    expect(isGuestOnlyPath(publicRoutes("pl").login)).toBe(true);
    expect(isGuestOnlyPath(publicRoutes("pl").register)).toBe(true);
    expect(isGuestOnlyPath(publicRoutes("uk").login)).toBe(true);
    expect(isGuestOnlyPath(publicRoutes("uk").register)).toBe(true);
  });

  it("nie obejmuje strony głównej", () => {
    expect(isGuestOnlyPath("/")).toBe(false);
  });
});

describe("landingPathForRole", () => {
  it("odsyła najemcę do jego panelu", () => {
    expect(landingPathForRole("TENANT")).toBe(ROUTES.tenantDashboard);
  });

  it("odsyła właściciela i administratora do panelu właściciela", () => {
    expect(landingPathForRole("OWNER")).toBe(ROUTES.ownerDashboard);
    expect(landingPathForRole("ADMIN")).toBe(ROUTES.ownerDashboard);
  });

  it("przy nieznanej roli wybiera panel właściciela", () => {
    expect(landingPathForRole(undefined)).toBe(ROUTES.ownerDashboard);
  });
});

describe("safeReturnPath", () => {
  it("przepuszcza ścieżki w obrębie domeny razem z zapytaniem", () => {
    expect(safeReturnPath("/panel")).toBe("/panel");
    expect(safeReturnPath("/panel/finanse?status=OVERDUE")).toBe("/panel/finanse?status=OVERDUE");
  });

  it("odrzuca adresy prowadzące na obcą domenę", () => {
    for (const raw of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\tevil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "\\\\evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeReturnPath(raw), raw).toBeUndefined();
    }
  });

  it("przy braku wartości zwraca undefined", () => {
    expect(safeReturnPath(undefined)).toBeUndefined();
    expect(safeReturnPath("")).toBeUndefined();
  });
});

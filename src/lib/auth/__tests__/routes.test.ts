import { describe, expect, it } from "vitest";

import {
  isGuestOnlyPath,
  isProtectedPath,
  landingPathForRole,
  ROUTES,
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
    expect(isProtectedPath("/logowanie")).toBe(false);
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
    expect(isGuestOnlyPath(ROUTES.login)).toBe(true);
    expect(isGuestOnlyPath(ROUTES.register)).toBe(true);
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

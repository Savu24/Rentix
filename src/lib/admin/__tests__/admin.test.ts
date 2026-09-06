import { describe, expect, it } from "vitest";

import { ADMIN_NAV, isAdminNavItemActive } from "@/lib/admin/nav";
import { AdminAction } from "@/generated/prisma/enums";
import {
  ADMIN_ACTION_LABELS,
  organizationSearchSchema,
  subscriptionUpdateSchema,
  userActionSchema,
} from "@/lib/validations/admin";

describe("nawigacja panelu administratora", () => {
  const item = (href: string) => ADMIN_NAV.find((entry) => entry.href === href)!;

  it("„Przegląd” podświetla się wyłącznie na swoim adresie", () => {
    // Jako prefiks pasowałby do każdej podstrony naraz z właściwą pozycją.
    expect(isAdminNavItemActive(item("/admin"), "/admin")).toBe(true);
    expect(isAdminNavItemActive(item("/admin"), "/admin/organizacje")).toBe(false);
  });

  it("sekcja obejmuje swoje podstrony", () => {
    const organizations = item("/admin/organizacje");

    expect(isAdminNavItemActive(organizations, "/admin/organizacje")).toBe(true);
    expect(isAdminNavItemActive(organizations, "/admin/organizacje/abc123")).toBe(true);
    expect(isAdminNavItemActive(organizations, "/admin/uzytkownicy")).toBe(false);
  });
});

describe("dziennik audytu", () => {
  it("ma opis każdej akcji ze schematu", () => {
    // Brakujący opis wyszedłby dopiero jako puste miejsce w dzienniku,
    // czyli przy okazji reklamacji, a nie przy dokładaniu akcji.
    for (const action of Object.values(AdminAction)) {
      expect(ADMIN_ACTION_LABELS[action]).toBeTruthy();
    }
  });
});

describe("zmiana subskrypcji", () => {
  it("puste pole limitu znaczy „próg z planu”", () => {
    const parsed = subscriptionUpdateSchema.parse({ plan: "PRO", leaseLimit: "" });

    expect(parsed.leaseLimit).toBeNull();
    expect(parsed.plan).toBe("PRO");
  });

  it("przyjmuje limit wpisany tekstem z formularza", () => {
    expect(subscriptionUpdateSchema.parse({ leaseLimit: "20" }).leaseLimit).toBe(20);
  });

  it("zero to próg, a nie brak wartości", () => {
    expect(subscriptionUpdateSchema.parse({ leaseLimit: "0" }).leaseLimit).toBe(0);
  });

  it("odrzuca żądanie, które niczego nie zmienia", () => {
    expect(subscriptionUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("odrzuca nieznany plan", () => {
    expect(subscriptionUpdateSchema.safeParse({ plan: "ENTERPRISE" }).success).toBe(false);
  });
});

describe("operacje na koncie", () => {
  it("pozwala nadać i odebrać uprawnienia administratora", () => {
    expect(userActionSchema.safeParse({ action: "SET_ROLE", role: "ADMIN" }).success).toBe(true);
    expect(userActionSchema.safeParse({ action: "SET_ROLE", role: "OWNER" }).success).toBe(true);
  });

  it("nie pozwala zrobić z kogokolwiek najemcy", () => {
    // Rola TENANT przenosi konto do portalu najemcy i odcina je od organizacji,
    // w których pracuje — to nie jest zmiana uprawnień, tylko inna aplikacja.
    expect(userActionSchema.safeParse({ action: "SET_ROLE", role: "TENANT" }).success).toBe(false);
  });

  it("zna tylko akcje z listy", () => {
    expect(userActionSchema.safeParse({ action: "DELETE_ACCOUNT" }).success).toBe(false);
  });
});

describe("filtry list", () => {
  it("puste wyszukiwanie jest poprawne", () => {
    expect(organizationSearchSchema.parse({}).q).toBeUndefined();
  });

  it("odrzuca nieznany plan w adresie", () => {
    expect(organizationSearchSchema.safeParse({ plan: "GOLD" }).success).toBe(false);
  });
});

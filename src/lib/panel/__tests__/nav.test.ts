import { describe, expect, it } from "vitest";

import { isNavItemActive, MOBILE_NAV, PANEL_NAV } from "@/lib/panel/nav";

const item = (href: string) => PANEL_NAV.find((entry) => entry.href === href)!;

describe("isNavItemActive", () => {
  it("pulpit świeci się wyłącznie na dokładnej ścieżce", () => {
    // Bez tego wyjątku "/panel" byłby prefiksem każdej podstrony i pulpit
    // świeciłby się wszędzie razem z właściwą pozycją.
    expect(isNavItemActive(item("/panel"), "/panel")).toBe(true);
    expect(isNavItemActive(item("/panel"), "/panel/nieruchomosci")).toBe(false);
  });

  it("pozycja świeci się na swojej podstronie", () => {
    const properties = item("/panel/nieruchomosci");
    expect(isNavItemActive(properties, "/panel/nieruchomosci")).toBe(true);
    expect(isNavItemActive(properties, "/panel/nieruchomosci/abc123")).toBe(true);
    expect(isNavItemActive(properties, "/panel/nieruchomosci/abc123/edytuj")).toBe(true);
  });

  it("nie łapie ścieżki o wspólnym początku, ale innej gałęzi", () => {
    expect(isNavItemActive(item("/panel/nieruchomosci"), "/panel/nieruchomosci-archiwum")).toBe(false);
  });

  it("nie świeci się na obcej ścieżce", () => {
    expect(isNavItemActive(item("/panel/nieruchomosci"), "/panel/najemcy")).toBe(false);
  });
});

describe("konfiguracja nawigacji", () => {
  it("dolny pasek mobilny ma pięć pozycji", () => {
    // Więcej nie mieści się czytelnie na szerokości telefonu.
    expect(MOBILE_NAV).toHaveLength(5);
  });

  it("każda pozycja mobilna istnieje w nawigacji głównej", () => {
    const hrefs = new Set(PANEL_NAV.map((entry) => entry.href));
    for (const entry of MOBILE_NAV) expect(hrefs.has(entry.href)).toBe(true);
  });

  it("ścieżki są unikalne", () => {
    const hrefs = PANEL_NAV.map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("zbudowane moduły nie są oznaczone jako 'wkrótce'", () => {
    for (const href of [
      "/panel",
      "/panel/nieruchomosci",
      "/panel/najemcy",
      "/panel/umowy",
      "/panel/finanse",
      "/panel/raporty",
      "/panel/ustawienia",
    ]) {
      expect(item(href).soon).toBeUndefined();
    }
  });

  it("wszystkie pozycje prowadzą do zbudowanych stron", () => {
    // Znacznik `soon` zostaje w typie pod przyszłe moduły, ale dziś żadna
    // pozycja nie jest ślepym linkiem.
    expect(PANEL_NAV.filter((entry) => entry.soon)).toHaveLength(0);
  });

  it("nie ma modułu zgłoszeń usterek", () => {
    // Świadoma decyzja, nie przeoczenie: najemcy zgłaszają awarie telefonem.
    expect(PANEL_NAV.some((entry) => entry.href === "/panel/zgloszenia")).toBe(false);
  });
});

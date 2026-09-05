import { describe, expect, it } from "vitest";

import {
  isLocale,
  localeFromAcceptLanguage,
  localeFromCountry,
  localeFromPathname,
  localePath,
} from "@/lib/i18n/config";

describe("localeFromPathname", () => {
  it("czyta kraj z pierwszego segmentu", () => {
    expect(localeFromPathname("/pl")).toBe("pl");
    expect(localeFromPathname("/uk/login")).toBe("uk");
    expect(localeFromPathname("/pl/logowanie")).toBe("pl");
  });

  it("nie widzi kraju tam, gdzie go nie ma", () => {
    expect(localeFromPathname("/")).toBeNull();
    expect(localeFromPathname("/panel/najemcy")).toBeNull();
    // „plan" zaczyna się od „pl", ale nie jest prefiksem kraju.
    expect(localeFromPathname("/plan")).toBeNull();
  });
});

describe("localePath", () => {
  it("skleja ścieżkę z prefiksem kraju", () => {
    expect(localePath("uk", "/login")).toBe("/uk/login");
    expect(localePath("pl", "logowanie")).toBe("/pl/logowanie");
  });

  it("stroną główną wersji jest sam prefiks, bez ukośnika na końcu", () => {
    expect(localePath("pl")).toBe("/pl");
    expect(localePath("uk", "/")).toBe("/uk");
  });
});

describe("localeFromAcceptLanguage", () => {
  it("wybiera wersję po języku, nie po regionie", () => {
    expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe("uk");
    // Amerykanin też trafia na brytyjską — to jedyna anglojęzyczna wersja.
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("uk");
    expect(localeFromAcceptLanguage("pl-PL,pl;q=0.9")).toBe("pl");
  });

  it("respektuje wagi q, a nie kolejność zapisu", () => {
    expect(localeFromAcceptLanguage("de;q=0.9,en;q=0.8,pl;q=0.7")).toBe("uk");
    expect(localeFromAcceptLanguage("en;q=0.3,pl;q=0.8")).toBe("pl");
  });

  it("pomija języki z zerową wagą", () => {
    expect(localeFromAcceptLanguage("en;q=0,pl;q=0.5")).toBe("pl");
  });

  it("zwraca null, gdy nie ma czego dopasować", () => {
    expect(localeFromAcceptLanguage(null)).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.8")).toBeNull();
  });
});

describe("localeFromCountry", () => {
  it("mapuje kod kraju na jego wersję", () => {
    expect(localeFromCountry("GB")).toBe("uk");
    expect(localeFromCountry("PL")).toBe("pl");
  });

  it("nie przejmuje się wielkością liter ani spacjami", () => {
    expect(localeFromCountry("gb")).toBe("uk");
    expect(localeFromCountry(" PL ")).toBe("pl");
  });

  it("zwraca null dla kraju bez własnej wersji — pytanie wraca do języka", () => {
    expect(localeFromCountry("DE")).toBeNull();
    expect(localeFromCountry("UK")).toBeNull();
    expect(localeFromCountry(null)).toBeNull();
    expect(localeFromCountry("")).toBeNull();
  });
});

describe("isLocale", () => {
  it("przepuszcza wyłącznie znane skróty krajów", () => {
    expect(isLocale("pl")).toBe(true);
    expect(isLocale("uk")).toBe(true);
    // „en" to kod języka, a segment w adresie jest skrótem kraju.
    expect(isLocale("en")).toBe(false);
    expect(isLocale("gb")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

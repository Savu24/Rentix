import { describe, expect, it } from "vitest";

/**
 * Regresja z wdrożenia na Vercela: zmienna dodana w panelu bez wartości
 * przychodzi jako pusty string, a nie `undefined`. `AUTH_URL=""` przechodziło
 * przez `??` i wywracało budowanie na `new URL("")`.
 */
function withoutBlanks(source: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
}

describe("odsiewanie pustych zmiennych środowiskowych", () => {
  it("usuwa pusty string, więc wartość awaryjna zadziała", () => {
    const result = withoutBlanks({ AUTH_URL: "", DATABASE_URL: "postgres://x" });

    expect("AUTH_URL" in result).toBe(false);
    expect(result.AUTH_URL ?? "http://localhost:3000").toBe("http://localhost:3000");
  });

  it("usuwa też wartość z samych spacji", () => {
    // Wklejenie ze schowka potrafi zostawić spację — efekt jest ten sam.
    expect("APP_URL" in withoutBlanks({ APP_URL: "   " })).toBe(false);
  });

  it("nie rusza wartości poprawnych", () => {
    const result = withoutBlanks({ APP_URL: "https://rentix.vercel.app" });
    expect(result.APP_URL).toBe("https://rentix.vercel.app");
  });

  it("nie gubi zmiennej o wartości '0'", () => {
    // Filtr sprawdza pusty string, nie fałszywość — inaczej "0" by zniknęło.
    expect(withoutBlanks({ SOMETHING: "0" }).SOMETHING).toBe("0");
  });
});

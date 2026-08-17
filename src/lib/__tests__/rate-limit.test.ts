import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, consume, isDistributed, reset, resetAll } from "@/lib/rate-limit";

const POLICY = { limit: 3, windowSeconds: 60 };

beforeEach(() => {
  resetAll();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consume", () => {
  it("przepuszcza próby do wyczerpania limitu", async () => {
    expect((await consume("a", POLICY)).success).toBe(true);
    expect((await consume("a", POLICY)).success).toBe(true);
    expect((await consume("a", POLICY)).success).toBe(true);
  });

  it("blokuje próbę ponad limit", async () => {
    for (let i = 0; i < POLICY.limit; i++) await consume("a", POLICY);

    const blocked = await consume("a", POLICY);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("odlicza pozostałe próby", async () => {
    expect((await consume("a", POLICY)).remaining).toBe(2);
    expect((await consume("a", POLICY)).remaining).toBe(1);
    expect((await consume("a", POLICY)).remaining).toBe(0);
  });

  it("liczy klucze niezależnie — blokada jednego konta nie dotyka innego", async () => {
    for (let i = 0; i < POLICY.limit; i++) await consume("login:a@example.com", POLICY);

    expect((await consume("login:a@example.com", POLICY)).success).toBe(false);
    expect((await consume("login:b@example.com", POLICY)).success).toBe(true);
  });

  it("otwiera nowe okno po upływie czasu", async () => {
    for (let i = 0; i < POLICY.limit; i++) await consume("a", POLICY);
    expect((await consume("a", POLICY)).success).toBe(false);

    vi.advanceTimersByTime(POLICY.windowSeconds * 1000 + 1);

    expect((await consume("a", POLICY)).success).toBe(true);
  });

  it("nie otwiera okna przed czasem", async () => {
    for (let i = 0; i < POLICY.limit; i++) await consume("a", POLICY);

    vi.advanceTimersByTime(POLICY.windowSeconds * 1000 - 1000);

    expect((await consume("a", POLICY)).success).toBe(false);
  });
});

describe("wybór backendu", () => {
  it("bez konfiguracji Upstash liczy w pamięci procesu", () => {
    // To jest tryb lokalny i testowy. Na serverless byłby dziurą: każda
    // instancja startowałaby z własnym, wyzerowanym licznikiem.
    expect(isDistributed()).toBe(false);
  });
});

describe("reset", () => {
  it("zeruje licznik po udanym logowaniu", async () => {
    for (let i = 0; i < POLICY.limit; i++) await consume("a", POLICY);
    expect((await consume("a", POLICY)).success).toBe(false);

    await reset("a");

    expect((await consume("a", POLICY)).success).toBe(true);
  });
});

describe("clientIp", () => {
  it("bierze pierwszy adres z x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("spada na x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("bez nagłówków zwraca wspólny klucz zamiast pomijać limit", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

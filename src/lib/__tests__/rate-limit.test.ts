import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, consume, reset, resetAll } from "@/lib/rate-limit";

const POLICY = { limit: 3, windowSeconds: 60 };

beforeEach(() => {
  resetAll();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consume", () => {
  it("przepuszcza próby do wyczerpania limitu", () => {
    expect(consume("a", POLICY).success).toBe(true);
    expect(consume("a", POLICY).success).toBe(true);
    expect(consume("a", POLICY).success).toBe(true);
  });

  it("blokuje próbę ponad limit", () => {
    for (let i = 0; i < POLICY.limit; i++) consume("a", POLICY);

    const blocked = consume("a", POLICY);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("odlicza pozostałe próby", () => {
    expect(consume("a", POLICY).remaining).toBe(2);
    expect(consume("a", POLICY).remaining).toBe(1);
    expect(consume("a", POLICY).remaining).toBe(0);
  });

  it("liczy klucze niezależnie — blokada jednego konta nie dotyka innego", () => {
    for (let i = 0; i < POLICY.limit; i++) consume("login:a@example.com", POLICY);

    expect(consume("login:a@example.com", POLICY).success).toBe(false);
    expect(consume("login:b@example.com", POLICY).success).toBe(true);
  });

  it("otwiera nowe okno po upływie czasu", () => {
    for (let i = 0; i < POLICY.limit; i++) consume("a", POLICY);
    expect(consume("a", POLICY).success).toBe(false);

    vi.advanceTimersByTime(POLICY.windowSeconds * 1000 + 1);

    expect(consume("a", POLICY).success).toBe(true);
  });

  it("nie otwiera okna przed czasem", () => {
    for (let i = 0; i < POLICY.limit; i++) consume("a", POLICY);

    vi.advanceTimersByTime(POLICY.windowSeconds * 1000 - 1000);

    expect(consume("a", POLICY).success).toBe(false);
  });
});

describe("reset", () => {
  it("zeruje licznik po udanym logowaniu", () => {
    for (let i = 0; i < POLICY.limit; i++) consume("a", POLICY);
    expect(consume("a", POLICY).success).toBe(false);

    reset("a");

    expect(consume("a", POLICY).success).toBe(true);
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

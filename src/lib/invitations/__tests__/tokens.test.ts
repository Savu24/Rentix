import { describe, expect, it } from "vitest";

import {
  hashToken,
  INVITATION_TTL_DAYS,
  invitationExpiry,
  invitationPath,
  issueToken,
  tokenMatches,
} from "@/lib/invitations/tokens";

/**
 * Tokeny zaproszeń. To jedyny element tej funkcji, w którym pomyłka nie
 * objawia się błędem, tylko cichą dziurą — stąd test na każdą własność,
 * na której opiera się bezpieczeństwo linku.
 */

describe("wystawianie tokenu", () => {
  it("do bazy idzie skrót, nie token", () => {
    const { token, tokenHash } = issueToken();

    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dwa wywołania dają różne tokeny", () => {
    expect(issueToken().token).not.toBe(issueToken().token);
  });

  it("token nadaje się do wklejenia w adres", () => {
    const { token } = issueToken();

    expect(token).toBe(encodeURIComponent(token));
    expect(token.length).toBeGreaterThanOrEqual(40);
  });
});

describe("dopasowanie tokenu", () => {
  it("skrót tego samego tokenu jest zawsze ten sam", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("uznaje własny token", () => {
    const { token, tokenHash } = issueToken();

    expect(tokenMatches(token, tokenHash)).toBe(true);
  });

  it("odrzuca cudzy token i śmieci", () => {
    const { tokenHash } = issueToken();

    expect(tokenMatches(issueToken().token, tokenHash)).toBe(false);
    expect(tokenMatches("", tokenHash)).toBe(false);
    // Skrót o innej długości nie może wywrócić porównania stałoczasowego.
    expect(tokenMatches("abc", "deadbeef")).toBe(false);
  });
});

describe("termin ważności", () => {
  it("liczy się od chwili wystawienia", () => {
    const now = new Date("2026-09-06T12:00:00.000Z");
    const expiry = invitationExpiry(now);

    expect(expiry.toISOString()).toBe("2026-09-20T12:00:00.000Z");
    expect(INVITATION_TTL_DAYS).toBe(14);
  });
});

describe("adres zaproszenia", () => {
  it("koduje token w ścieżce", () => {
    expect(invitationPath("abc")).toBe("/zaproszenie/abc");
  });
});

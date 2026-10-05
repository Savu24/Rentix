import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/i18n/format";
import { resolveMessageStatus } from "@/lib/messages/status";

describe("resolveMessageStatus", () => {
  it("nieudana wysyłka zostaje błędem, cokolwiek wie Resend", () => {
    expect(resolveMessageStatus({ status: "FAILED", deliveryEvent: "delivered" })).toBe("failed");
  });

  it("wysłana bez wiedzy z Resend to po prostu wysłana", () => {
    expect(resolveMessageStatus({ status: "SENT", deliveryEvent: null })).toBe("sent");
  });

  it("status z Resend wygrywa z naszym", () => {
    expect(resolveMessageStatus({ status: "SENT", deliveryEvent: "bounced" })).toBe("bounced");
    expect(resolveMessageStatus({ status: "SENT", deliveryEvent: "delivered" })).toBe("delivered");
  });

  it("nieznane zdarzenie nie psuje widoku", () => {
    expect(resolveMessageStatus({ status: "SENT", deliveryEvent: "cos-nowego" })).toBe("sent");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-05T12:00:00Z");

  it("liczy godziny wstecz po polsku", () => {
    expect(formatRelativeTime(new Date("2026-10-05T10:00:00Z"), now, "pl")).toBe("2 godziny temu");
  });

  it("mówi „wczoraj”, a nie „1 dzień temu”", () => {
    expect(formatRelativeTime(new Date("2026-10-04T12:00:00Z"), now, "pl")).toBe("wczoraj");
  });

  it("po angielsku dla wersji brytyjskiej", () => {
    expect(formatRelativeTime(new Date("2026-10-05T11:55:00Z"), now, "uk")).toBe("5 minutes ago");
  });
});

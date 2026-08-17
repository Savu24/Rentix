import { describe, expect, it } from "vitest";

import type { NotificationType } from "@/generated/prisma/enums";
import { chooseNotification, OVERDUE_REPEAT_DAYS } from "@/lib/notifications/schedule";

const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

function candidate(options: {
  issueDate: Date;
  dueDate: Date;
  sent?: Array<[NotificationType, Date]>;
}) {
  return {
    issueDate: options.issueDate,
    dueDate: options.dueDate,
    sentTypes: new Map<NotificationType, Date>(options.sent ?? []),
  };
}

describe("chooseNotification", () => {
  it("świeżo wystawiony dokument dostaje zawiadomienie", () => {
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 1), dueDate: utc(2026, 9, 10) }),
      utc(2026, 8, 2),
    );

    expect(result).toBe("INVOICE_ISSUED");
  });

  it("zawiadomienie o wystawieniu wychodzi tylko raz", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 9, 10),
        sent: [["INVOICE_ISSUED", utc(2026, 8, 1)]],
      }),
      utc(2026, 8, 2),
    );

    expect(result).toBeNull();
  });

  it("stary dokument bez zawiadomienia nie dostaje go z opóźnieniem", () => {
    // Wiadomość „wystawiliśmy dokument" trzy tygodnie po fakcie tylko myli.
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 1), dueDate: utc(2026, 9, 20) }),
      utc(2026, 8, 25),
    );

    expect(result).toBeNull();
  });

  it("przypomnienie wychodzi w tygodniu przed terminem", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 8, 11),
        sent: [["INVOICE_ISSUED", utc(2026, 8, 1)]],
      }),
      utc(2026, 8, 8),
    );

    expect(result).toBe("PAYMENT_REMINDER");
  });

  it("przypomnienie ma pierwszeństwo przed zawiadomieniem o wystawieniu", () => {
    // Dokument wystawiony z krótkim terminem: jedna wiadomość zamiast dwóch,
    // i to ta pilniejsza.
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 8), dueDate: utc(2026, 8, 11) }),
      utc(2026, 8, 8),
    );

    expect(result).toBe("PAYMENT_REMINDER");
  });

  it("w dniu terminu jeszcze przypominamy, a nie wzywamy", () => {
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 1), dueDate: utc(2026, 8, 11) }),
      utc(2026, 8, 11),
    );

    expect(result).toBe("PAYMENT_REMINDER");
  });

  it("dzień po terminie to już zaległość", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 8, 11),
        sent: [["PAYMENT_REMINDER", utc(2026, 8, 8)]],
      }),
      utc(2026, 8, 12),
    );

    expect(result).toBe("PAYMENT_OVERDUE");
  });

  it("wezwania nie ponawiamy codziennie", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 8, 11),
        sent: [["PAYMENT_OVERDUE", utc(2026, 8, 12)]],
      }),
      utc(2026, 8, 15),
    );

    expect(result).toBeNull();
  });

  it("wezwanie wraca po tygodniu", () => {
    const lastSent = utc(2026, 8, 12);
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 8, 11),
        sent: [["PAYMENT_OVERDUE", lastSent]],
      }),
      new Date(lastSent.getTime() + OVERDUE_REPEAT_DAYS * 24 * 60 * 60 * 1000),
    );

    expect(result).toBe("PAYMENT_OVERDUE");
  });

  it("dokument z odległym terminem i wysłanym zawiadomieniem czeka w spokoju", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 8, 1),
        dueDate: utc(2026, 9, 30),
        sent: [["INVOICE_ISSUED", utc(2026, 8, 1)]],
      }),
      utc(2026, 8, 5),
    );

    expect(result).toBeNull();
  });
});

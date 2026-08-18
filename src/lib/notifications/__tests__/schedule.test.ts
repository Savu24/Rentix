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

describe("rytm ustawiony przez wynajmującego", () => {
  it("przypomina wcześniej, gdy konto tak ustawiło", () => {
    // Domyślnie okno przypomnień to 7 dni. Przy ustawieniu 14 dokument
    // z terminem za 10 dni już się w nim mieści.
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 7, 1),
        dueDate: utc(2026, 8, 20),
        sent: [["INVOICE_ISSUED", utc(2026, 7, 1)]],
      }),
      utc(2026, 8, 10),
      { reminderDaysBefore: 14, overdueRepeatDays: 7 },
    );

    expect(result).toBe("PAYMENT_REMINDER");
  });

  it("nie przypomina, gdy do terminu dalej niż ustawione okno", () => {
    const result = chooseNotification(
      candidate({
        issueDate: utc(2026, 7, 1),
        dueDate: utc(2026, 8, 20),
        sent: [["INVOICE_ISSUED", utc(2026, 7, 1)]],
      }),
      utc(2026, 8, 10),
      { reminderDaysBefore: 3, overdueRepeatDays: 7 },
    );

    expect(result).toBeNull();
  });

  it("ponawia wezwanie w rytmie konta, nie co tydzień na sztywno", () => {
    const shared = {
      issueDate: utc(2026, 7, 1),
      dueDate: utc(2026, 8, 1),
      sent: [["PAYMENT_OVERDUE", utc(2026, 8, 10)]] as Array<[NotificationType, Date]>,
    };

    // Trzy dni po ostatnim wezwaniu: przy rytmie co 3 dni już pora, przy 14 —
    // jeszcze nie.
    expect(
      chooseNotification(candidate(shared), utc(2026, 8, 13), {
        reminderDaysBefore: 7,
        overdueRepeatDays: 3,
      }),
    ).toBe("PAYMENT_OVERDUE");

    expect(
      chooseNotification(candidate(shared), utc(2026, 8, 13), {
        reminderDaysBefore: 7,
        overdueRepeatDays: 14,
      }),
    ).toBeNull();
  });
});

describe("wyłączone rodzaje powiadomień", () => {
  const schedule = { reminderDaysBefore: OVERDUE_REPEAT_DAYS, overdueRepeatDays: OVERDUE_REPEAT_DAYS };

  it("wyłączone wezwanie nie zamienia się w łagodniejsze przypomnienie", () => {
    // Dokument jest po terminie. Gdyby wyłączenie wezwań przepuszczało go dalej,
    // najemca dostałby „zbliża się termin" o płatności, która minęła — czyli
    // obejście decyzji, którą ktoś świadomie podjął.
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 7, 1), dueDate: utc(2026, 8, 1) }),
      utc(2026, 8, 10),
      schedule,
      new Set<NotificationType>(["PAYMENT_REMINDER", "INVOICE_ISSUED"]),
    );

    expect(result).toBeNull();
  });

  it("wyłączone przypomnienie nie blokuje zawiadomienia o wystawieniu", () => {
    // To dwie różne wiadomości, a nie dwa natężenia tej samej.
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 1), dueDate: utc(2026, 8, 5) }),
      utc(2026, 8, 2),
      schedule,
      new Set<NotificationType>(["INVOICE_ISSUED"]),
    );

    expect(result).toBe("INVOICE_ISSUED");
  });

  it("pusty zbiór wyłącza wszystko", () => {
    const result = chooseNotification(
      candidate({ issueDate: utc(2026, 8, 1), dueDate: utc(2026, 9, 10) }),
      utc(2026, 8, 2),
      schedule,
      new Set<NotificationType>(),
    );

    expect(result).toBeNull();
  });
});

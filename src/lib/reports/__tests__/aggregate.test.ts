import { describe, expect, it } from "vitest";

import {
  buildCsv,
  collectionStats,
  monthlyBreakdown,
  propertyBreakdown,
  toCsvAmount,
  type CashEntry,
} from "@/lib/reports/aggregate";

const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

const entry = (month: number, amountGrosze: number, propertyId: string | null = null): CashEntry => ({
  at: utc(2026, month, 15),
  amountGrosze,
  propertyId,
});

describe("monthlyBreakdown", () => {
  it("zawsze zwraca dwanaście miesięcy", () => {
    // Miesiąc bez ruchu musi zostać w tabeli: dziura w osi czasu czytałaby się
    // jak brak danych, a nie jak zero wpływów.
    const rows = monthlyBreakdown([entry(3, 240000)], []);
    expect(rows).toHaveLength(12);
    expect(rows[0]?.incomeGrosze).toBe(0);
    expect(rows[0]?.label).toBe("styczeń");
  });

  it("wrzuca kwoty do miesiąca przepływu", () => {
    const rows = monthlyBreakdown([entry(3, 240000), entry(3, 100000)], [entry(3, 45000)]);

    expect(rows[2]?.incomeGrosze).toBe(340000);
    expect(rows[2]?.expenseGrosze).toBe(45000);
    expect(rows[2]?.profitGrosze).toBe(295000);
  });

  it("miesiąc z samymi kosztami wychodzi na minus", () => {
    const rows = monthlyBreakdown([], [entry(7, 120000)]);
    expect(rows[6]?.profitGrosze).toBe(-120000);
  });

  it("przypisuje miesiąc po UTC, nie po strefie serwera", () => {
    // 1 stycznia 00:00 UTC to jeszcze 31 grudnia w strefach na zachód od UTC —
    // liczenie lokalnie przesunęłoby wpłatę do poprzedniego roku.
    const rows = monthlyBreakdown(
      [{ at: new Date("2026-01-01T00:00:00.000Z"), amountGrosze: 100000, propertyId: null }],
      [],
    );

    expect(rows[0]?.incomeGrosze).toBe(100000);
    expect(rows[11]?.incomeGrosze).toBe(0);
  });
});

describe("propertyBreakdown", () => {
  const names = new Map([
    ["p1", "Długa 14"],
    ["p2", "Krótka 3"],
  ]);

  it("liczy wynik per nieruchomość", () => {
    const rows = propertyBreakdown(
      [entry(1, 240000, "p1"), entry(2, 180000, "p2")],
      [entry(1, 40000, "p1")],
      names,
    );

    const first = rows.find((row) => row.propertyId === "p1")!;
    expect(first.name).toBe("Długa 14");
    expect(first.profitGrosze).toBe(200000);
  });

  it("koszty bez przypisania idą do osobnego wiersza, nie są rozdzielane", () => {
    // Każdy klucz podziału byłby zmyślony, a zmyślona liczba w raporcie jest
    // gorsza niż jawne „koszty ogólne".
    const rows = propertyBreakdown([entry(1, 240000, "p1")], [entry(1, 30000, null)], names);

    const general = rows.find((row) => row.propertyId === null)!;
    expect(general.name).toBe("Koszty ogólne");
    expect(general.expenseGrosze).toBe(30000);
    expect(rows.find((row) => row.propertyId === "p1")!.expenseGrosze).toBe(0);
  });

  it("koszty ogólne stoją na końcu, nawet gdy są największe", () => {
    const rows = propertyBreakdown(
      [entry(1, 10000, "p1")],
      [entry(1, 900000, null)],
      names,
    );

    expect(rows.at(-1)?.propertyId).toBeNull();
  });

  it("sortuje nieruchomości po wyniku malejąco", () => {
    const rows = propertyBreakdown(
      [entry(1, 100000, "p1"), entry(1, 500000, "p2")],
      [],
      names,
    );

    expect(rows[0]?.propertyId).toBe("p2");
  });

  it("nazywa nieruchomość usuniętą zamiast pokazywać identyfikator", () => {
    const rows = propertyBreakdown([entry(1, 100000, "zniknieta")], [], names);
    expect(rows[0]?.name).toBe("nieruchomość usunięta");
  });
});

describe("collectionStats", () => {
  const invoice = (options: {
    due: Date;
    total: number;
    paid: number;
    lastPaymentAt?: Date | null;
  }) => ({
    dueDate: options.due,
    totalGrossGrosze: options.total,
    paidGrosze: options.paid,
    lastPaymentAt: options.lastPaymentAt ?? null,
  });

  it("pusty zbiór nie dzieli przez zero", () => {
    expect(collectionStats([]).collectionRate).toBe(0);
  });

  it("liczy odsetek rozliczonych", () => {
    const stats = collectionStats([
      invoice({ due: utc(2026, 1, 10), total: 100000, paid: 100000, lastPaymentAt: utc(2026, 1, 9) }),
      invoice({ due: utc(2026, 2, 10), total: 100000, paid: 0 }),
    ]);

    expect(stats.collectionRate).toBe(50);
    expect(stats.paidCount).toBe(1);
  });

  it("wpłata częściowa nie liczy się jako rozliczenie", () => {
    const stats = collectionStats([
      invoice({ due: utc(2026, 1, 10), total: 100000, paid: 60000, lastPaymentAt: utc(2026, 1, 9) }),
    ]);

    expect(stats.paidCount).toBe(0);
  });

  it("średnie opóźnienie bierze tylko zapłacone po terminie", () => {
    // Gdyby wciągnąć wcześniejsze wpłaty z ujemnym opóźnieniem, wynik
    // wyzerowałby się i pokazał „0 dni" właścicielowi, któremu połowa
    // najemców płaci dwa tygodnie po czasie.
    const stats = collectionStats([
      invoice({ due: utc(2026, 1, 10), total: 100000, paid: 100000, lastPaymentAt: utc(2026, 1, 1) }),
      invoice({ due: utc(2026, 2, 10), total: 100000, paid: 100000, lastPaymentAt: utc(2026, 2, 20) }),
    ]);

    expect(stats.lateCount).toBe(1);
    expect(stats.averageDelayDays).toBe(10);
  });

  it("zapłata w dniu terminu nie jest opóźnieniem", () => {
    const stats = collectionStats([
      invoice({ due: utc(2026, 1, 10), total: 100000, paid: 100000, lastPaymentAt: utc(2026, 1, 10) }),
    ]);

    expect(stats.lateCount).toBe(0);
    expect(stats.averageDelayDays).toBe(0);
  });
});

describe("CSV", () => {
  it("kwoty w polskim zapisie dziesiętnym", () => {
    expect(toCsvAmount(240050)).toBe("2400,50");
    expect(toCsvAmount(-1200)).toBe("-12,00");
  });

  it("rozdziela kolumny średnikiem", () => {
    // Polski Excel czyta przecinek jako część liczby, więc przy separatorze
    // przecinkowym „2400,50" rozpadłoby się na dwie kolumny.
    const csv = buildCsv(["A", "B"], [["1", "2"]]);
    expect(csv).toContain("A;B");
    expect(csv).toContain("1;2");
  });

  it("zaczyna się od BOM-u", () => {
    // Bez niego Excel otwiera UTF-8 jako windows-1250 i polskie znaki
    // zamieniają się w krzaki.
    expect(buildCsv(["Miesiąc"], [])).toMatch(/^﻿/);
  });

  it("cytuje komórki ze średnikiem i cudzysłowem", () => {
    const csv = buildCsv(["A"], [['Remont; łazienka "duża"']]);
    expect(csv).toContain('"Remont; łazienka ""duża"""');
  });
});

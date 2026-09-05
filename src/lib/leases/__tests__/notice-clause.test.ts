import { describe, expect, it } from "vitest";

import { noticeClause, type LeasePdfData } from "@/lib/leases/pdf";

/**
 * Klauzula wypowiedzenia z § 2 umowy.
 *
 * Testujemy samo zdanie, a nie wyrenderowany PDF: to jest treść prawna, którą
 * strony podpisują, i jej brzmienie ma się nie zmienić przypadkiem przy
 * kolejnej zmianie układu dokumentu.
 */
const base = { noticePeriodMonths: null } as unknown as LeasePdfData;

describe("noticeClause", () => {
  it("bez ustalonego okresu odsyła do terminów ustawowych", () => {
    const text = noticeClause(base);

    expect(text).toContain("Kodeksu cywilnego");
    expect(text).toContain("ochronie praw lokatorów");
  });

  it("zero traktuje jak brak ustalenia, a nie wypowiedzenie ze skutkiem natychmiastowym", () => {
    expect(noticeClause({ ...base, noticePeriodMonths: 0 })).toBe(noticeClause(base));
  });

  it("jeden miesiąc odmienia w liczbie pojedynczej", () => {
    expect(noticeClause({ ...base, noticePeriodMonths: 1 })).toContain("1 miesiąca");
  });

  it("trzy miesiące kończą wypowiedzenie na koniec miesiąca kalendarzowego", () => {
    const text = noticeClause({ ...base, noticePeriodMonths: 3 });

    expect(text).toContain("3 miesięcy");
    expect(text).toContain("ze skutkiem na koniec miesiąca kalendarzowego");
  });
});

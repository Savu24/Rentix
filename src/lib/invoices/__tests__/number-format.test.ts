import { describe, expect, it } from "vitest";

import {
  DEFAULT_NUMBER_FORMAT,
  MAX_NUMBER_FORMAT_LENGTH,
  NUMBER_FORMAT_PRESETS,
  numberFormatProblem,
  numberingPeriod,
  numberingPeriodBounds,
  renderNumberFormat,
  sequenceInNumber,
} from "@/lib/invoices/number-format";
import { getDictionary } from "@/lib/i18n";

/** 11 września 2026, północ UTC — tak leżą w bazie daty wystawienia. */
const DATE = new Date(Date.UTC(2026, 8, 11));

describe("renderNumberFormat", () => {
  it("podstawia symbole, resztę przepisuje dosłownie", () => {
    expect(renderNumberFormat("{n}/{m}/{y}", 3, DATE)).toBe("3/09/2026");
    expect(renderNumberFormat("{y}/{m}/{n}", 3, DATE)).toBe("2026/09/3");
    expect(renderNumberFormat("{d}/{m}/{y}/{n}", 3, DATE)).toBe("11/09/2026/3");
    expect(renderNumberFormat("{m}/{y}/A/{n}", 3, DATE)).toBe("09/2026/A/3");
    expect(renderNumberFormat("{n}", 128, DATE)).toBe("128");
  });

  it("domyślny wzór daje dotychczasowy zapis", () => {
    expect(renderNumberFormat(DEFAULT_NUMBER_FORMAT, 3, DATE)).toBe("3/09/2026");
  });
});

describe("numberingPeriod", () => {
  it("miesiąc we wzorze → licznik miesięczny, sam rok → roczny, brak daty → ciągły", () => {
    expect(numberingPeriod("{n}/{m}/{y}")).toBe("month");
    expect(numberingPeriod("{d}/{m}/{y}/{n}")).toBe("month");
    expect(numberingPeriod("{n}/{y}")).toBe("year");
    expect(numberingPeriod("{n}")).toBe("none");
    expect(numberingPeriod("A/{n}")).toBe("none");
  });

  it("zakres dat obejmuje miesiąc, rok albo nic", () => {
    expect(numberingPeriodBounds("{n}/{m}/{y}", DATE)).toEqual({
      gte: new Date(Date.UTC(2026, 8, 1)),
      lt: new Date(Date.UTC(2026, 9, 1)),
    });
    expect(numberingPeriodBounds("{n}/{y}", DATE)).toEqual({
      gte: new Date(Date.UTC(2026, 0, 1)),
      lt: new Date(Date.UTC(2027, 0, 1)),
    });
    expect(numberingPeriodBounds("{n}", DATE)).toEqual({});
  });
});

describe("sequenceInNumber", () => {
  it("czyta numer porządkowy według wzoru, bez względu na litery serii", () => {
    expect(sequenceInNumber("R 2026/09/7", "{y}/{m}/{n}", DATE)).toBe(7);
    expect(sequenceInNumber("2026/09/7", "{y}/{m}/{n}", DATE)).toBe(7);
    expect(sequenceInNumber("PF 09/2026/A/12", "{m}/{y}/A/{n}", DATE)).toBe(12);
  });

  it("dzień jest dowolny — dokumenty z różnych dni dzielą licznik miesiąca", () => {
    expect(sequenceInNumber("03/09/2026/4", "{d}/{m}/{y}/{n}", DATE)).toBe(4);
    expect(sequenceInNumber("30/09/2026/5", "{d}/{m}/{y}/{n}", DATE)).toBe(5);
  });

  it("numer z innego okresu albo innego wzoru jest nie do odczytania", () => {
    expect(sequenceInNumber("2026/08/7", "{y}/{m}/{n}", DATE)).toBeNull();
    expect(sequenceInNumber("7/09/2026", "{y}/{m}/{n}", DATE)).toBeNull();
    expect(sequenceInNumber("7/2026", "{n}/{y}", new Date(Date.UTC(2025, 8, 11)))).toBeNull();
  });

  it("kropka i myślnik we wzorze są znakami, a nie regexpem", () => {
    expect(sequenceInNumber("R 3.09.2026", "{n}.{m}.{y}", DATE)).toBe(3);
    expect(sequenceInNumber("R 3x09x2026", "{n}.{m}.{y}", DATE)).toBeNull();
    expect(sequenceInNumber("2026-09-3", "{y}-{m}-{n}", DATE)).toBe(3);
  });

  it("numeracja ciągła czyta numer niezależnie od daty", () => {
    expect(sequenceInNumber("FV 512", "{n}", new Date(Date.UTC(2031, 0, 1)))).toBe(512);
  });
});

describe("numberFormatProblem", () => {
  it("gotowe wzory są poprawne", () => {
    for (const preset of NUMBER_FORMAT_PRESETS) {
      expect(numberFormatProblem(preset)).toBeNull();
    }
    expect(numberFormatProblem("{m}/{y}/A/{n}")).toBeNull();
    expect(numberFormatProblem("FV-{y}-{n}")).toBeNull();
    expect(numberFormatProblem("{n}")).toBeNull();
  });

  it("nazywa wadę po imieniu", () => {
    expect(numberFormatProblem("")).toBe("empty");
    expect(numberFormatProblem(`{n}/${"x".repeat(MAX_NUMBER_FORMAT_LENGTH)}`)).toBe("tooLong");
    expect(numberFormatProblem("{n}/{q}")).toBe("unknownToken");
    expect(numberFormatProblem("{n}#{y}")).toBe("badChars");
    expect(numberFormatProblem("{n}/{y")).toBe("badChars");
    expect(numberFormatProblem("{m}/{y}")).toBe("noSequence");
    expect(numberFormatProblem("{n}/{n}")).toBe("manySequences");
    expect(numberFormatProblem("{n}{m}/{y}")).toBe("adjacentTokens");
    expect(numberFormatProblem("{n}/{m}")).toBe("monthWithoutYear");
    expect(numberFormatProblem("{d}/{y}/{n}")).toBe("dayWithoutMonth");
  });

  it("każda wada ma komunikat w obu wersjach krajowych", () => {
    const problems = [
      "empty",
      "tooLong",
      "badChars",
      "unknownToken",
      "noSequence",
      "manySequences",
      "adjacentTokens",
      "monthWithoutYear",
      "dayWithoutMonth",
    ] as const;
    for (const locale of ["pl", "uk"] as const) {
      const t = getDictionary(locale).panel.settings.numbering;
      for (const problem of problems) expect(t.problems[problem]).toBeTruthy();
      for (const preset of NUMBER_FORMAT_PRESETS) expect(t.presets[preset]).toBeTruthy();
    }
  });
});

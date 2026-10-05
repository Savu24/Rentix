import { describe, expect, it } from "vitest";

import { sortByInvoiceNumber } from "@/lib/invoices/number-sort";

const doc = (number: string, issued: string, status = "ISSUED") => ({
  number,
  issueDate: new Date(`${issued}T00:00:00.000Z`),
  status,
});

const numbers = (list: { number: string }[]) => list.map((entry) => entry.number);

describe("sortByInvoiceNumber", () => {
  it("licznik liczbowo, a nie jak tekst", () => {
    const list = [doc("10/08/2026", "2026-08-20"), doc("2/08/2026", "2026-08-02"), doc("1/08/2026", "2026-08-01")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "asc"))).toEqual([
      "1/08/2026",
      "2/08/2026",
      "10/08/2026",
    ]);
  });

  it("przy liczniku miesięcznym najpierw miesiąc, potem numer", () => {
    // „1/09" ma mniejszy licznik niż „2/08", ale leży później w rejestrze.
    const list = [doc("1/09/2026", "2026-09-01"), doc("2/08/2026", "2026-08-05"), doc("1/01/2027", "2027-01-03")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "asc"))).toEqual([
      "2/08/2026",
      "1/09/2026",
      "1/01/2027",
    ]);
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "desc"))).toEqual([
      "1/01/2027",
      "1/09/2026",
      "2/08/2026",
    ]);
  });

  it("przy liczniku dziennym najpierw dzień, potem numer", () => {
    const list = [
      doc("02/10/2026/1", "2026-10-02"),
      doc("01/10/2026/12", "2026-10-01"),
      doc("02/10/2026/2", "2026-10-02"),
      doc("01/10/2026/2", "2026-10-01"),
    ];
    expect(numbers(sortByInvoiceNumber(list, "{d}/{m}/{y}/{n}", "asc"))).toEqual([
      "01/10/2026/2",
      "01/10/2026/12",
      "02/10/2026/1",
      "02/10/2026/2",
    ]);
  });

  it("przy liczniku rocznym miesiąc wystawienia nie rozdziela okresu", () => {
    const list = [doc("12/2026", "2026-03-01"), doc("3/2026", "2026-01-10"), doc("1/2027", "2027-01-02")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{y}", "asc"))).toEqual(["3/2026", "12/2026", "1/2027"]);
  });

  it("seria z przodu nie przeszkadza w odczycie licznika", () => {
    const list = [doc("R 11/08/2026", "2026-08-20"), doc("R 9/08/2026", "2026-08-10")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "asc"))).toEqual([
      "R 9/08/2026",
      "R 11/08/2026",
    ]);
  });

  it("numer spoza wzoru zostaje w swoim okresie, za odczytanymi", () => {
    const list = [doc("4/08/2026 KOR", "2026-08-15"), doc("5/08/2026", "2026-08-16"), doc("1/09/2026", "2026-09-01")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "asc"))).toEqual([
      "5/08/2026",
      "4/08/2026 KOR",
      "1/09/2026",
    ]);
  });

  it("szkice zawsze na końcu", () => {
    const list = [doc("szkic-abc", "2026-09-30", "DRAFT"), doc("1/08/2026", "2026-08-01"), doc("2/08/2026", "2026-08-02")];
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "asc")).at(-1)).toBe("szkic-abc");
    expect(numbers(sortByInvoiceNumber(list, "{n}/{m}/{y}", "desc")).at(-1)).toBe("szkic-abc");
  });
});

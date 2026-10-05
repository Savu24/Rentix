import { describe, expect, it } from "vitest";

import { clientDictionary } from "@/lib/i18n";
import { invoiceIssueSchema, invoiceNumberSchema } from "@/lib/validations/invoice";

const c = { locale: "pl" as const, d: clientDictionary("pl") };

describe("numer dokumentu wpisany ręcznie", () => {
  it("przyjmuje zapis z innego programu", () => {
    expect(invoiceNumberSchema(c).parse({ number: " FV 12/10/2026 " }).number).toBe("FV 12/10/2026");
  });

  it("odrzuca prefiks numeru zastępczego szkicu", () => {
    // Dokument z takim numerem wszędzie uchodziłby za szkic.
    const result = invoiceNumberSchema(c).safeParse({ number: "Szkic-1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(c.d.panel.invoices.numberReserved);
  });
});

describe("zatwierdzenie szkicu", () => {
  it("bez numeru — numer nada licznik", () => {
    expect(invoiceIssueSchema(c).parse({}).number).toBeUndefined();
    expect(invoiceIssueSchema(c).parse({ number: "   " }).number).toBeUndefined();
  });

  it("z numerem — idzie dalej przycięty", () => {
    expect(invoiceIssueSchema(c).parse({ number: " 05/10/2026/3 " }).number).toBe("05/10/2026/3");
  });

  it("niepoprawny numer nie przechodzi", () => {
    expect(invoiceIssueSchema(c).safeParse({ number: "/12" }).success).toBe(false);
  });
});

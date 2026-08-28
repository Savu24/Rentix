import { describe, expect, it } from "vitest";

import { formatPostalCode } from "@/components/ui/postal-code-input";

describe("formatPostalCode", () => {
  it("wstawia myślnik po dwóch cyfrach", () => {
    // Bez maski właściciel dowiadywał się o wymaganym zapisie 00-000 dopiero
    // z błędu walidacji przy zapisie formularza.
    expect(formatPostalCode("30001")).toBe("30-001");
  });

  it("nie dopisuje myślnika, dopóki nie ma trzeciej cyfry", () => {
    expect(formatPostalCode("")).toBe("");
    expect(formatPostalCode("3")).toBe("3");
    expect(formatPostalCode("30")).toBe("30");
  });

  it("zostawia kod już wpisany z myślnikiem bez zmian", () => {
    expect(formatPostalCode("30-001")).toBe("30-001");
  });

  it("odsiewa litery i nadmiarowe cyfry", () => {
    expect(formatPostalCode("30 001")).toBe("30-001");
    expect(formatPostalCode("30-0012345")).toBe("30-001");
    expect(formatPostalCode("abc")).toBe("");
  });
});

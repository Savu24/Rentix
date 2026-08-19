import { describe, expect, it } from "vitest";

import { invoiceRecipient } from "@/lib/invoices/recipient";

const zUmowy = { firstName: "Jan", lastName: "Kowalski", email: "jan@przyklad.pl" };
const zFaktury = { firstName: "Anna", lastName: "Nowak", email: "anna@przyklad.pl" };

describe("odbiorca dokumentu", () => {
  it("bierze najemcę z umowy, gdy dokument jest z nią powiązany", () => {
    const result = invoiceRecipient({
      lease: { tenants: [{ tenant: zUmowy }] },
      tenant: zFaktury,
    });

    // Umowa opisuje bieżący stosunek najmu; nabywca zapisany na fakturze bywa
    // historyczny, gdy umowę przepisano na kogoś innego.
    expect(result).toBe(zUmowy);
  });

  it("bierze nabywcę z faktury, gdy dokument stoi poza umową", () => {
    // To jest przypadek, który wcześniej nie miał adresata w ogóle: dokument
    // jednorazowy pokazywał komunikat o brakującym adresie najemcy, choć adres
    // był uzupełniony — brakowało powiązania, nie adresu.
    const result = invoiceRecipient({ lease: null, tenant: zFaktury });

    expect(result).toBe(zFaktury);
  });

  it("zwraca null, gdy nie ma ani umowy, ani nabywcy", () => {
    expect(invoiceRecipient({ lease: null, tenant: null })).toBeNull();
    expect(invoiceRecipient({})).toBeNull();
  });

  it("nie myli umowy bez najemców z umową z najemcą", () => {
    // Umowa istnieje, ale nie ma na niej nikogo — wtedy nabywca z faktury
    // jest jedyną drogą do odbiorcy.
    const result = invoiceRecipient({ lease: { tenants: [] }, tenant: zFaktury });

    expect(result).toBe(zFaktury);
  });

  it("odbiorca bez adresu to nie to samo co brak odbiorcy", () => {
    // Wołający rozróżniają te przypadki, bo prowadzą do dwóch różnych miejsc
    // w panelu: kartoteki najemcy albo wyboru umowy.
    const bezAdresu = { firstName: "Piotr", email: null };
    const result = invoiceRecipient({ lease: null, tenant: bezAdresu });

    expect(result).not.toBeNull();
    expect(result?.email).toBeNull();
  });
});

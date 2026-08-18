import { describe, expect, it } from "vitest";

import { formatFrom, senderAddress } from "../sender";

const PLATFORM = "Rentix <powiadomienia@rentix.com.pl>";

describe("senderAddress", () => {
  it("wyłuskuje adres z nagłówka z nazwą", () => {
    expect(senderAddress(PLATFORM)).toBe("powiadomienia@rentix.com.pl");
  });

  it("zwraca adres bez nazwy bez zmian", () => {
    expect(senderAddress("powiadomienia@rentix.com.pl")).toBe("powiadomienia@rentix.com.pl");
  });
});

describe("formatFrom", () => {
  it("podstawia nazwę wynajmującego przed adres platformy", () => {
    expect(formatFrom(PLATFORM, "Miret")).toBe('"Miret" <powiadomienia@rentix.com.pl>');
  });

  it("zostawia adres platformy nietknięty przy każdej organizacji", () => {
    const first = formatFrom(PLATFORM, "Miret");
    const second = formatFrom(PLATFORM, "Kowalski Nieruchomości");

    expect(senderAddress(first)).toBe(senderAddress(second));
    expect(second).toBe('"Kowalski Nieruchomości" <powiadomienia@rentix.com.pl>');
  });

  /*
    Nazwa firmy z przecinkiem bez cudzysłowu rozbiłaby nagłówek na dwóch
    adresatów: `Miret, sp. z o.o. <adres>` to dla serwera poczty lista.
  */
  it("cytuje nazwę z przecinkiem, żeby nie rozpadła się na dwa adresy", () => {
    expect(formatFrom(PLATFORM, "Miret, sp. z o.o.")).toBe(
      '"Miret, sp. z o.o." <powiadomienia@rentix.com.pl>',
    );
  });

  it("poprzedza ukośnikiem cudzysłów wewnątrz nazwy", () => {
    expect(formatFrom(PLATFORM, 'Firma "Dom"')).toBe(
      '"Firma \\"Dom\\"" <powiadomienia@rentix.com.pl>',
    );
  });

  it("bez nazwy zwraca konfigurację w całości", () => {
    expect(formatFrom(PLATFORM, null)).toBe(PLATFORM);
    expect(formatFrom(PLATFORM, "   ")).toBe(PLATFORM);
    expect(formatFrom(PLATFORM, undefined)).toBe(PLATFORM);
  });
});

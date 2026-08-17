import type { InvoiceKind, InvoiceStatus, PropertyType, VatRate } from "@/generated/prisma/enums";

import { isZeroVat } from "./vat";

/**
 * Reguły wystawiania dokumentów — bez dostępu do bazy.
 *
 * Wydzielone z serwisu celowo: to tutaj mieszkają decyzje, które trzeba umieć
 * sprawdzić testem (jaka stawka, jaki rodzaj dokumentu, jaki status po wpłacie),
 * a import klienta Prismy ciągnąłby za sobą całą konfigurację środowiska.
 */

/** Dane nabywcy kopiowane na dokument w chwili wystawienia. */
export type BuyerSnapshot = {
  buyerName: string;
  buyerTaxId: string | null;
  buyerStreet: string | null;
  buyerPostalCode: string | null;
  buyerCity: string | null;
};

export type TenantLike = {
  firstName: string;
  lastName: string;
  taxId: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
};

/**
 * Migawka nabywcy.
 *
 * Kopiujemy dane, zamiast czytać je przez relację: faktura jest dokumentem
 * księgowym i po zmianie nazwiska czy adresu najemcy musi nadal pokazywać
 * stan z dnia wystawienia.
 */
export function buyerSnapshot(tenant: TenantLike): BuyerSnapshot {
  return {
    buyerName: `${tenant.firstName} ${tenant.lastName}`,
    buyerTaxId: tenant.taxId,
    buyerStreet: tenant.street,
    buyerPostalCode: tenant.postalCode,
    buyerCity: tenant.city,
  };
}

/**
 * Rodzaj dokumentu wynika ze stawek na pozycjach.
 *
 * Najem mieszkaniowy jest zwolniony z VAT, więc właściciel wystawia rachunek.
 * Gdy choć jedna pozycja ma stawkę z podatkiem, dokument musi być fakturą VAT —
 * inaczej nie da się z niego odliczyć podatku.
 */
export function invoiceKindForLines(lines: readonly { vatRate: VatRate }[]): InvoiceKind {
  return lines.every((line) => isZeroVat(line.vatRate)) ? "BILL" : "VAT_INVOICE";
}

/**
 * Stawka VAT dla czynszu.
 *
 * Najem lokalu mieszkalnego na cele mieszkaniowe jest zwolniony (art. 43 ust. 1
 * pkt 36 ustawy o VAT). Lokal użytkowy i miejsce postojowe zwolnieniu nie
 * podlegają — tam obowiązuje stawka podstawowa.
 */
export function rentVatRate(propertyType: PropertyType): VatRate {
  return propertyType === "COMMERCIAL" || propertyType === "PARKING" ? "RATE_23" : "ZW";
}

/**
 * Status rozliczenia wyliczony z sumy wpłat.
 *
 * Nadpłata też oznacza „opłacona" — reszta jest tematem zwrotu, a nie powodem,
 * żeby dokument dalej straszył na liście zaległości.
 */
export function settlementStatus(totalGrossGrosze: number, paidGrosze: number): InvoiceStatus {
  if (paidGrosze <= 0) return "ISSUED";
  return paidGrosze >= totalGrossGrosze ? "PAID" : "PARTIALLY_PAID";
}

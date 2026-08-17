import type { VatRate } from "@/generated/prisma/enums";
import { multiplyByQuantity, roundHalf, sumGrosze } from "@/lib/money";

import { VAT_PERCENT } from "./vat";

/** Pozycja faktury przed policzeniem kwot. */
export type InvoiceLineInput = {
  description: string;
  /** Ilość w tysięcznych — 1 szt. = 1000, 4,235 m³ = 4235. */
  quantityMilli: number;
  unit?: string;
  unitPriceNetGrosze: number;
  vatRate: VatRate;
};

export type CalculatedLine = InvoiceLineInput & {
  netGrosze: number;
  vatGrosze: number;
  grossGrosze: number;
};

export type InvoiceTotals = {
  lines: CalculatedLine[];
  totalNetGrosze: number;
  totalVatGrosze: number;
  totalGrossGrosze: number;
  /** Rozbicie po stawkach — wymagane na fakturze VAT i w JPK. */
  vatBreakdown: Array<{ rate: VatRate; netGrosze: number; vatGrosze: number }>;
};

/**
 * Liczy kwoty pojedynczej pozycji.
 *
 * Zaokrąglamy dwa razy i tylko tutaj: raz przy mnożeniu ceny przez ilość,
 * raz przy naliczeniu podatku. Brutto jest sumą, a nie osobnym zaokrągleniem —
 * inaczej netto + VAT potrafiłoby nie zgadzać się z brutto o grosz.
 */
export function calculateLine(line: InvoiceLineInput): CalculatedLine {
  const netGrosze = multiplyByQuantity(line.unitPriceNetGrosze, line.quantityMilli);
  const vatGrosze = roundHalf((netGrosze * VAT_PERCENT[line.vatRate]) / 100);

  return {
    ...line,
    netGrosze,
    vatGrosze,
    grossGrosze: netGrosze + vatGrosze,
  };
}

/**
 * Liczy sumy całej faktury.
 *
 * VAT sumujemy z pozycji, a nie liczymy od sumy netto. Przy mieszanych stawkach
 * (czynsz zw. + prąd 23%) liczenie od sumy dałoby wynik bez sensu, a nawet przy
 * jednej stawce obie metody potrafią różnić się o grosz — norma i JPK wymagają
 * sumowania po pozycjach.
 */
export function calculateInvoiceTotals(lines: readonly InvoiceLineInput[]): InvoiceTotals {
  const calculated = lines.map(calculateLine);

  const byRate = new Map<VatRate, { netGrosze: number; vatGrosze: number }>();
  for (const line of calculated) {
    const bucket = byRate.get(line.vatRate) ?? { netGrosze: 0, vatGrosze: 0 };
    bucket.netGrosze += line.netGrosze;
    bucket.vatGrosze += line.vatGrosze;
    byRate.set(line.vatRate, bucket);
  }

  const totalNetGrosze = sumGrosze(calculated.map((line) => line.netGrosze));
  const totalVatGrosze = sumGrosze(calculated.map((line) => line.vatGrosze));

  return {
    lines: calculated,
    totalNetGrosze,
    totalVatGrosze,
    totalGrossGrosze: totalNetGrosze + totalVatGrosze,
    vatBreakdown: [...byRate.entries()].map(([rate, sums]) => ({ rate, ...sums })),
  };
}

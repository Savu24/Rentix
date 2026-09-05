import type { VatRate } from "@/generated/prisma/enums";
import type { Dictionary } from "@/lib/i18n/types";

/**
 * Stawki VAT używane przez Rentix, w rozbiciu zgodnym ze strukturą FA(2).
 *
 * Domyślną stawką jest ZW (zwolniony): wynajem lokali mieszkalnych na cele
 * mieszkaniowe jest zwolniony z VAT na podstawie art. 43 ust. 1 pkt 36 ustawy
 * o VAT, więc dotyczy to większości użytkowników Rentiksa. Stawki 8% i 23%
 * pojawiają się przy najmie krótkoterminowym i lokalach użytkowych.
 */
export const VAT_PERCENT: Record<VatRate, number> = {
  ZW: 0,
  NP: 0,
  RATE_0: 0,
  RATE_5: 5,
  RATE_8: 8,
  RATE_23: 23,
};

/**
 * Etykieta stawki na dokumencie i w panelu.
 *
 * „zw." i „np." to zapis wymagany na polskiej fakturze. Po brytyjsku te same
 * stany nazywają się „Exempt" i „Outside scope" — skrótu z polskiej ustawy
 * nikt tam nie odczyta.
 */
export function vatLabels(d: Dictionary): Record<VatRate, string> {
  return d.documents.vat;
}

/**
 * Czy stawka oznacza brak podatku należnego.
 *
 * ZW (zwolniony) i NP (nie podlega) dają zero VAT tak samo jak stawka 0%,
 * ale na dokumencie i w JPK są trzema różnymi rzeczami — stąd osobne wartości
 * enuma zamiast jednego "0".
 */
export function isZeroVat(rate: VatRate): boolean {
  return VAT_PERCENT[rate] === 0;
}

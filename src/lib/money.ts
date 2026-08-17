/**
 * Arytmetyka pieniędzy w groszach.
 *
 * Wszystkie kwoty w Rentiksie to liczby całkowite groszy — nigdy Float.
 * Powód jest prozaiczny: 0.1 + 0.2 !== 0.3 w IEEE 754, a po tysiącu faktur
 * saldo rozjeżdża się o grosze, których nikt potem nie znajdzie.
 *
 * Ten moduł jest jedynym miejscem, w którym wolno zaokrąglać.
 */

const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // CLDR dla polskiego nie grupuje liczb czterocyfrowych ("2400,00 zł", ale
  // "18 400,00 zł"). W kolumnie faktur wygląda to na literówkę, więc grupujemy
  // zawsze — kwoty mają się czytać jednakowo w każdym wierszu.
  useGrouping: "always",
});

/** 240000 → "2 400,00 zł" */
export function formatPLN(grosze: number): string {
  return currencyFormatter.format(grosze / 100);
}

/** 240000 → "2 400,00" (bez symbolu waluty — do pól formularza i eksportu CSV). */
export function formatAmount(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: "always",
  }).format(grosze / 100);
}

/**
 * Parsuje kwotę wpisaną przez człowieka na grosze.
 *
 * Przyjmuje polski zapis ("2 400,50", "2400,5"), zapis z kropką ("2400.50"),
 * spacje nierozdzielające wklejone z arkusza i symbol waluty.
 * Zwraca `null`, gdy wejście nie jest kwotą — wołający decyduje, co z tym zrobić.
 */
export function parsePLN(input: string): number | null {
  if (typeof input !== "string") return null;

  const cleaned = input
    .replace(/\s/g, "") // spacje, w tym nierozdzielające z arkuszy
    .replace(/z[łl]$/i, "") // "zł" na końcu
    .replace(/PLN$/i, "")
    .replace(",", "."); // polski przecinek dziesiętny

  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;

  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  // Więcej niż dwa miejsca po przecinku to nie kwota w złotych, tylko pomyłka.
  if (parts[1] !== undefined && parts[1].length > 2) return null;

  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = cleaned.replace("-", "").split(".");
  const grosze = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isFinite(grosze)) return null;
  return negative ? -grosze : grosze;
}

/**
 * Zaokrąglenie handlowe: połówki od zera.
 *
 * `Math.round` zaokrągla połówki ku +∞, więc -0,5 daje -0 zamiast -1.
 * Przy korektach i notach ujemnych to dawałoby grosz różnicy w złą stronę.
 */
export function roundHalf(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Mnoży kwotę jednostkową przez ilość podaną w tysięcznych.
 *
 * Ilość na fakturze ma trzy miejsca po przecinku (4,235 m³ wody), więc
 * przekazujemy ją jako liczbę całkowitą tysięcznych — 4235 — żeby mnożenie
 * odbyło się na liczbach całkowitych, a zaokrąglenie nastąpiło raz, na końcu.
 */
export function multiplyByQuantity(unitPriceGrosze: number, quantityMilli: number): number {
  return roundHalf((unitPriceGrosze * quantityMilli) / 1000);
}

/** Zamienia ilość "4.235" albo 4.235 na tysięczne (4235). */
export function toQuantityMilli(quantity: number | string): number {
  const value = typeof quantity === "string" ? Number(quantity.replace(",", ".")) : quantity;
  if (!Number.isFinite(value)) throw new Error(`Nieprawidłowa ilość: ${quantity}`);
  return roundHalf(value * 1000);
}

export function sumGrosze(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Dzieli kwotę na `parts` części tak, żeby suma części równała się dokładnie
 * kwocie wejściowej. Reszta z dzielenia rozchodzi się po jednym groszu
 * na pierwsze części — bez tego podział 100,00 zł na 3 dałby 99,99 zł.
 *
 * Potrzebne przy dzieleniu opłat wspólnych między najemców.
 */
export function splitGrosze(total: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`Liczba części musi być dodatnią liczbą całkowitą, otrzymano ${parts}`);
  }
  const sign = total < 0 ? -1 : 1;
  const absolute = Math.abs(total);
  const base = Math.floor(absolute / parts);
  const remainder = absolute - base * parts;

  return Array.from({ length: parts }, (_, index) =>
    sign * (base + (index < remainder ? 1 : 0)),
  );
}

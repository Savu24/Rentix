import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Łączy klasy Tailwinda, rozstrzygając konflikty na korzyść ostatniej. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatowanie i arytmetyka kwot mieszkają w jednym module — `@/lib/money`.
// Re-eksport, żeby istniejące importy `formatPLN` z `@/lib/utils` dalej działały
// i żeby nie powstała druga implementacja zaokrąglania.
export { formatAmount, formatPLN, parsePLN } from "./money";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(date: Date | string): string {
  return dateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

/**
 * Polska odmiana rzeczownika przez liczbę.
 *
 *   plural(1, ["pokój", "pokoje", "pokoi"])  → "pokój"
 *   plural(4, [...])                          → "pokoje"
 *   plural(5, [...])                          → "pokoi"
 *   plural(12, [...])                         → "pokoi"   (nastki są wyjątkiem)
 *
 * Bez tego wszędzie lądowałoby „4 pokoi”, bo warunek `n === 1 ? a : b`
 * gubi środkową formę.
 */
export function plural(count: number, forms: [string, string, string]): string {
  const absolute = Math.abs(count);
  if (absolute === 1) return forms[0];

  const lastTwo = absolute % 100;
  const last = absolute % 10;

  // 12–14 wyglądają jak 2–4 na ostatniej cyfrze, ale biorą dopełniacz.
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return forms[1];
  return forms[2];
}

/** Inicjały do awatara: "Aleksandra Kowal" → "AK". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Zamienia nazwę organizacji na slug URL-owy: "Kowalski Nieruchomości" → "kowalski-nieruchomosci". */
export function slugify(input: string): string {
  return input
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    // Usuwa znaki diakrytyczne rozłożone przez NFD (ą → a + ogonek).
    // Ł/ł nie ma dekompozycji NFD, dlatego jest podmieniane wyżej.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

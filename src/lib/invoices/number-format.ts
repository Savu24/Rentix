/**
 * Wzór numeru dokumentu.
 *
 * Numer powstaje z daty wystawienia i licznika według wzoru, który ustawia
 * sobie organizacja. Symbole idą w nawiasach klamrowych:
 *
 *   {n} — kolejny numer w rejestrze
 *   {d} — dzień wystawienia (dwie cyfry)
 *   {m} — miesiąc wystawienia (dwie cyfry)
 *   {y} — rok wystawienia (cztery cyfry)
 *
 * Wszystko poza symbolami jest przepisywane dosłownie, więc „{m}/{y}/A/{n}"
 * daje „09/2026/A/3". Litery serii rodzaju dokumentu („R", „PF") NIE są
 * częścią wzoru — `numbering.ts` dokleja je z przodu, bo to one rozdzielają
 * rejestry i wzór nie może ich zgubić.
 *
 * Od czego zależy, kiedy licznik wraca do jedynki, mówi sam wzór — nie ma
 * osobnego przełącznika, bo osobny przełącznik pozwoliłby ustawić numerację
 * miesięczną bez miesiąca w numerze, a wtedy „3/2026" pojawiałoby się
 * w marcu i w kwietniu. Zasada: jest miesiąc → co miesiąc; jest sam rok →
 * co rok; nie ma daty → licznik biegnie bez końca. Dzień we wzorze licznika
 * nie resetuje: numeracja dzienna dawałaby „1" na każdym dokumencie, a to
 * nie jest rejestr, tylko data w przebraniu.
 *
 * Ten plik nie dotyka Prismy ani słownika — czyta go i numeracja na
 * serwerze, i podgląd w ustawieniach po stronie przeglądarki.
 */

export const DEFAULT_NUMBER_FORMAT = "{n}/{m}/{y}";

/**
 * Gotowe wzory do wyboru w ustawieniach. Kolejność jest kolejnością na
 * liście; domyślny stoi pierwszy.
 */
export const NUMBER_FORMAT_PRESETS = [
  "{n}/{m}/{y}",
  "{n}/{y}",
  "{y}/{m}/{n}",
  "{d}/{m}/{y}/{n}",
] as const;

export type NumberFormatPreset = (typeof NUMBER_FORMAT_PRESETS)[number];

export function isNumberFormatPreset(template: string): template is NumberFormatPreset {
  return (NUMBER_FORMAT_PRESETS as readonly string[]).includes(template);
}

/** Najdłuższy wzór, jaki przyjmujemy. Numer ma się mieścić w nagłówku PDF-a. */
export const MAX_NUMBER_FORMAT_LENGTH = 40;

const TOKENS = ["n", "d", "m", "y"] as const;
type Token = (typeof TOKENS)[number];

/** Symbol w klamrach; grupa łapie także nieznane symbole, żeby je zgłosić. */
const TOKEN_PATTERN = /\{([^{}]*)\}/g;

/** Znaki dopuszczalne między symbolami: litery, cyfry i typowe separatory. */
const LITERAL_PATTERN = /^[\p{L}\d/\-._ ]*$/u;

const pad = (value: number) => String(value).padStart(2, "0");

/** Wszystkie symbole ze wzoru, w kolejności, także nieznane. */
function tokensIn(template: string): string[] {
  return [...template.matchAll(TOKEN_PATTERN)].map((match) => match[1] as string);
}

export type NumberingPeriod = "month" | "year" | "none";

/** Co ile licznik wraca do jedynki — patrz komentarz na górze pliku. */
export function numberingPeriod(template: string): NumberingPeriod {
  if (template.includes("{m}")) return "month";
  if (template.includes("{y}")) return "year";
  return "none";
}

/**
 * Zakres dat wystawienia, w którym dokumenty dzielą jeden licznik.
 * Pusty obiekt przy numeracji ciągłej — wtedy liczy się cały rejestr.
 */
export function numberingPeriodBounds(
  template: string,
  issueDate: Date,
): { gte?: Date; lt?: Date } {
  const year = issueDate.getUTCFullYear();
  const month = issueDate.getUTCMonth();

  switch (numberingPeriod(template)) {
    case "month":
      return { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) };
    case "year":
      return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
    case "none":
      return {};
  }
}

/** Wzór → numer. Data po UTC, bo tak są zapisane daty wystawienia. */
export function renderNumberFormat(template: string, sequence: number, date: Date): string {
  const values: Record<Token, string> = {
    n: String(sequence),
    d: pad(date.getUTCDate()),
    m: pad(date.getUTCMonth() + 1),
    y: String(date.getUTCFullYear()),
  };

  return template.replace(TOKEN_PATTERN, (whole, token: string) =>
    (TOKENS as readonly string[]).includes(token) ? values[token as Token] : whole,
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Numer porządkowy wyłuskany z gotowego numeru dokumentu, o ile ten powstał
 * z podanego wzoru w tym samym okresie liczenia co `date`. NULL, gdy zapis
 * jest inny — po ręcznej korekcie albo po zmianie wzoru w ustawieniach.
 *
 * Dzień jest we wzorcu dowolny: dokumenty z różnych dni miesiąca dzielą
 * jeden licznik. Litery serii celowo nie wchodzą do wzorca (kotwica tylko
 * na końcu): dokument mógł powstać, zanim konto zmieniło kraj, a jego numer
 * i tak zajmuje miejsce w rejestrze.
 */
export function sequenceInNumber(number: string, template: string, date: Date): number | null {
  const parts: Record<Token, string> = {
    n: "(\\d+)",
    d: "\\d{2}",
    m: pad(date.getUTCMonth() + 1),
    y: String(date.getUTCFullYear()),
  };

  let pattern = "";
  let last = 0;
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    pattern += escapeRegExp(template.slice(last, match.index));
    const token = match[1] as string;
    pattern += (TOKENS as readonly string[]).includes(token)
      ? parts[token as Token]
      : escapeRegExp(match[0]);
    last = match.index + match[0].length;
  }
  pattern += escapeRegExp(template.slice(last));

  const found = new RegExp(`${pattern}$`).exec(number.trim());
  return found?.[1] ? Number(found[1]) : null;
}

/**
 * Wady wzoru, każda z własnym komunikatem w słowniku. Jedna naraz — pierwsza
 * z listy, bo pokazanie trzech zarzutów do jednego pola nie pomaga bardziej
 * niż jeden.
 */
export type NumberFormatProblem =
  | "empty"
  | "tooLong"
  | "badChars"
  | "unknownToken"
  | "noSequence"
  | "manySequences"
  | "adjacentTokens"
  | "monthWithoutYear"
  | "dayWithoutMonth";

export function numberFormatProblem(template: string): NumberFormatProblem | null {
  if (template === "") return "empty";
  if (template.length > MAX_NUMBER_FORMAT_LENGTH) return "tooLong";

  const tokens = tokensIn(template);
  if (tokens.some((token) => !(TOKENS as readonly string[]).includes(token))) {
    return "unknownToken";
  }

  // Poza symbolami zostają same litery, cyfry i separatory — pojedyncza
  // klamra bez pary też tu wypadnie, bo nie jest żadnym z nich.
  if (!LITERAL_PATTERN.test(template.replace(TOKEN_PATTERN, ""))) return "badChars";

  const sequences = tokens.filter((token) => token === "n").length;
  if (sequences === 0) return "noSequence";
  if (sequences > 1) return "manySequences";

  // „{n}{m}" dałoby „309" — trzech cyfr nie da się już rozdzielić na oko.
  if (/\}\{/.test(template)) return "adjacentTokens";

  // Miesiąc bez roku: „3/09" wypadłoby w każdym wrześniu, a numer jest
  // unikalny w całym rejestrze — drugi rok zderzyłby się z pierwszym.
  if (tokens.includes("m") && !tokens.includes("y")) return "monthWithoutYear";
  if (tokens.includes("d") && !tokens.includes("m")) return "dayWithoutMonth";

  return null;
}

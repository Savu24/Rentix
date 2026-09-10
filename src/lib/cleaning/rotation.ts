/**
 * Harmonogram sprzątania — podział miesiąca na tygodnie i rozdanie dyżurów.
 *
 * Czysta arytmetyka kalendarza i kolejności, bez bazy. Jedyna reguła, o którą
 * w tej tabelce chodzi — „nikt nie sprząta dwa tygodnie z rzędu" — daje się
 * dzięki temu sprawdzić testem na każdym brzegu miesiąca, łącznie ze stykiem
 * dwóch kolejnych.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Poniżej dwóch sprzątających nie ma czego rozdzielać ani między kogo. */
export const MIN_CLEANING_PARTICIPANTS = 2;

export type CleaningWeek = {
  /** Numer tygodnia w miesiącu, licząc od 1 — pierwsza kolumna tabelki. */
  index: number;
  startsOn: Date;
  endsOn: Date;
};

/**
 * Tygodnie miesiąca, przycięte do jego pierwszego i ostatniego dnia.
 *
 * Tydzień na styku miesięcy przecinamy świadomie: harmonogram na wrzesień ma
 * nosić numery wrześniowych dni. Gdyby tygodnie szły całe, ten jeden należałby
 * do dwóch miesięcy naraz i wygenerowanie października deptałoby wrzesień.
 *
 * Tydzień zaczyna się w poniedziałek — tak samo w Polsce i w Wielkiej Brytanii.
 * Daty są w UTC o północy, bo to dni kalendarza, a nie momenty w czasie.
 */
export function monthWeeks(year: number, monthIndex: number): CleaningWeek[] {
  // Dzień 0 kolejnego miesiąca to ostatni dzień tego — bez tablicy długości
  // miesięcy i bez osobnego przypadku na luty roku przestępnego.
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const monthEnd = Date.UTC(year, monthIndex, lastDay);

  const weeks: CleaningWeek[] = [];
  let start = Date.UTC(year, monthIndex, 1);

  while (start <= monthEnd) {
    // getUTCDay() liczy od niedzieli, a nasz tydzień zaczyna się w poniedziałek.
    const weekday = (new Date(start).getUTCDay() + 6) % 7;
    const end = Math.min(start + (6 - weekday) * DAY_MS, monthEnd);

    weeks.push({ index: weeks.length + 1, startsOn: new Date(start), endsOn: new Date(end) });
    start = end + DAY_MS;
  }

  return weeks;
}

/**
 * Rozdaje tygodnie między sprzątających.
 *
 * Kolejność losujemy, żeby „wygeneruj ponownie" naprawdę dawało inny podział,
 * ale chodzimy po niej karuzelą: przy dwóch i więcej uczestnikach sąsiednie
 * tygodnie nigdy nie trafiają na tego samego, a dyżurów każdy dostaje tyle
 * samo z dokładnością do jednego. Losowanie każdego tygodnia osobno musiałoby
 * tej samej reguły pilnować odrzucaniem wyników i potrafiłoby dać komuś cztery
 * dyżury pod rząd co drugi tydzień.
 *
 * `previousId` i `nextId` to sprzątający z tygodni tuż przed miesiącem i tuż
 * po nim — bez nich reguła pękałaby dokładnie na styku miesięcy, czyli tam,
 * gdzie nikt jej nie sprawdza. `random` wchodzi z zewnątrz, żeby test miał
 * ustalony wynik.
 */
export function rotateDuties<T extends { id: string }>(
  participants: readonly T[],
  weekCount: number,
  options: { previousId?: string | null; nextId?: string | null; random?: () => number } = {},
): T[] {
  if (participants.length < MIN_CLEANING_PARTICIPANTS || weekCount <= 0) return [];

  const order = shuffled(participants, options.random ?? Math.random);
  const size = order.length;
  const spin = (offset: number) =>
    Array.from({ length: weekCount }, (_, week) => order[(offset + week) % size]);

  /*
    Po wylosowaniu kolejności jedyną swobodą, jaka zostaje, jest miejsce startu
    karuzeli. Bierzemy pierwsze, które pasuje do sąsiednich miesięcy z obu
    stron. Gdy takiego nie ma — dwoje sprzątających i parzysta liczba tygodni
    potrafią zablokować obie strony naraz — ważniejszy jest styk z miesiącem
    poprzednim: ten użytkownik ma przed oczami, zanim przewinie dalej.
  */
  let fallback: number | null = null;

  for (let offset = 0; offset < size; offset += 1) {
    if (options.previousId && order[offset].id === options.previousId) continue;
    fallback ??= offset;

    if (options.nextId && order[(offset + weekCount - 1) % size].id === options.nextId) continue;
    return spin(offset);
  }

  return spin(fallback ?? 0);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/** „2026-09" → `{ year: 2026, monthIndex: 8 }`. `null`, gdy to nie jest miesiąc. */
export function parseMonthKey(value: string): { year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;

  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

/** Odwrotność `parseMonthKey`; przyjmuje też miesiące spoza 0–11 i przenosi rok. */
export function monthKey(year: number, monthIndex: number): string {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Dzień kalendarza w zapisie „2026-09-01" — tak dyżury jadą do przeglądarki. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

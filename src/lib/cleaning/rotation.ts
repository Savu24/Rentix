/**
 * Harmonogram sprzątania — podział zakresu dat na tygodnie i rozdanie dyżurów.
 *
 * Czysta arytmetyka kalendarza i kolejności, bez bazy. Reguła, o którą w tej
 * rozpisce chodzi — „nikt nie sprząta dwa tygodnie z rzędu" — daje się dzięki
 * temu sprawdzić testem na każdej długości zakresu.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Poniżej dwóch sprzątających nie ma czego rozdzielać ani między kogo. */
export const MIN_CLEANING_PARTICIPANTS = 2;

/**
 * Najdłuższy zakres, jaki da się rozpisać naraz — dwa lata.
 *
 * Rozpiska wisi na lodówce rok, może dwa; dłuższa i tak wymaga wydruku od nowa,
 * bo w tym czasie zmieniają się lokatorzy. Limit chroni też PDF: bez niego
 * jedno żądanie potrafiłoby zamówić kilkaset stron kalendarza.
 */
export const MAX_CLEANING_RANGE_DAYS = 2 * 366;

export type CleaningWeek = {
  /** Numer tygodnia w harmonogramie, licząc od 1. */
  index: number;
  startsOn: Date;
  endsOn: Date;
};

/**
 * Tygodnie zakresu: kolejne siódemki dni od `from`, ostatnia przycięta do `to`.
 *
 * Tydzień zaczyna się w dniu tygodnia, w którym zaczyna się harmonogram — nie
 * w poniedziałek. Rozpiska zaczęta w piątek idzie piątek–czwartek, bo tak
 * dyżur zmienia właściciela w dniu, w którym ludzie się wprowadzili, a nie
 * połową tygodnia później. Tygodnie przechodzą przez granice miesięcy w całości:
 * kartka pokazuje ten sam tydzień na końcu lipca i na początku sierpnia.
 *
 * Daty są w UTC o północy, bo to dni kalendarza, a nie momenty w czasie.
 */
export function rangeWeeks(from: Date, to: Date): CleaningWeek[] {
  const weeks: CleaningWeek[] = [];
  const last = to.getTime();
  let start = from.getTime();

  while (start <= last) {
    const end = Math.min(start + 6 * DAY_MS, last);

    weeks.push({ index: weeks.length + 1, startsOn: new Date(start), endsOn: new Date(end) });
    start = end + DAY_MS;
  }

  return weeks;
}

/**
 * Rozdaje tygodnie między sprzątających.
 *
 * Karuzela w kolejności, w jakiej przyszli — pokoje według pozycji w lokalu,
 * najemcy według umowy. Bez losowania: lokator ma z kartki odczytać rytm
 * („po pokoju 2 zawsze pokój 3"), a nie szukać siebie w każdym wierszu.
 * Przy dwóch i więcej uczestnikach sąsiednie tygodnie nigdy nie trafiają na
 * tego samego, a dyżurów każdy dostaje tyle samo z dokładnością do jednego.
 */
export function rotateDuties<T>(participants: readonly T[], weekCount: number): T[] {
  if (participants.length < MIN_CLEANING_PARTICIPANTS || weekCount <= 0) return [];

  return Array.from({ length: weekCount }, (_, week) => participants[week % participants.length]);
}

/** „2026-09-01" → północ UTC tego dnia. `null`, gdy to nie jest dzień kalendarza. */
export function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  // Odsiewa daty typu 2026-02-31, które Date po cichu przesuwa na marzec.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return date;
}

/** Dzień kalendarza w zapisie „2026-09-01" — tak dyżury jadą do przeglądarki. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Dzień przesunięty o `days` dni — dodatnie w przód, ujemne wstecz. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

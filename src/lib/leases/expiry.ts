import { plural } from "@/lib/utils";

/**
 * Odliczanie do końca umowy najmu.
 *
 * Właściciel musi zdążyć z decyzją: przedłużyć, wypowiedzieć albo zacząć
 * szukać kolejnego najemcy. Sama data końcowa na karcie tego nie załatwia —
 * „31 października" nic nie mówi, dopóki nie policzy się w pamięci ile to dni.
 * Dlatego przy najemcy pokazujemy liczbę dni, a nie datę.
 *
 * Wyliczamy z bieżącej daty, a nie z kolumny w bazie: licznik zmienia się
 * każdej nocy i zapisany stan byłby nieaktualny między przebiegami crona
 * (ta sama zasada co przy statusach faktur — patrz `invoices/status.ts`).
 */

/** Od ilu dni przed końcem umowy pokazujemy odliczanie. */
export const LEASE_EXPIRY_WINDOW_DAYS = 60;

/** Poniżej tylu dni odliczanie robi się krytyczne — wypowiedzenie ma zwykle miesiąc. */
const CRITICAL_DAYS = 7;

/** Poniżej tylu dni odliczanie ostrzega. */
const WARNING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Północ danego dnia w UTC — porównujemy dni, nie chwile. */
function startOfDayUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Liczba pełnych dni od dziś do końca umowy. Ujemna = umowa już się skończyła.
 *
 * Granica idzie po dniach, nie po godzinach: umowa kończąca się dziś ma zero
 * dni i o 23:00 nadal zero, a nie „minus jeden".
 */
export function daysUntilLeaseEnd(endDate: Date, now: Date): number {
  return Math.round((startOfDayUtc(endDate) - startOfDayUtc(now)) / DAY_MS);
}

/**
 * Data przesunięta o `months` miesięcy do przodu, w UTC.
 *
 * Do przedłużania umowy: „o rok" ma znaczyć ten sam dzień miesiąca, a nie
 * 365 dni, bo aneks pisze się datami, nie liczbą dni. Dzień przycinamy do
 * długości miesiąca docelowego — umowa do 31 marca przedłużona o miesiąc
 * kończy się 30 kwietnia, bo 31 kwietnia nie istnieje.
 */
export function addMonthsUtc(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)),
  );
}

export type LeaseExpiry = {
  /** Ile dni zostało. 0 = kończy się dziś. */
  days: number;
  label: string;
  tone: "neutral" | "warning" | "critical";
};

/**
 * Odliczanie do pokazania przy najemcy — albo `null`, gdy nie ma czego liczyć.
 *
 * `null` dostajemy przy umowie bezterminowej (brak daty końca), przy umowie
 * zakończonej (wtedy mówi o tym status, nie licznik) i wtedy, gdy do końca
 * jest dalej niż okno odliczania — lista najemców nie może świecić się na
 * żółto przez cały rok trwania umowy.
 */
export function resolveLeaseExpiry(
  endDate: Date | null | undefined,
  now: Date = new Date(),
): LeaseExpiry | null {
  if (!endDate) return null;

  const days = daysUntilLeaseEnd(endDate, now);
  if (days < 0 || days > LEASE_EXPIRY_WINDOW_DAYS) return null;

  return {
    days,
    label:
      days === 0
        ? "Umowa kończy się dziś"
        : `${days} ${plural(days, ["dzień", "dni", "dni"])} do końca umowy`,
    tone: days <= CRITICAL_DAYS ? "critical" : days <= WARNING_DAYS ? "warning" : "neutral",
  };
}

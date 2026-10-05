import { DRAFT_NUMBER_PREFIX } from "./draft";
import { numberingPeriodBounds, sequenceInNumber } from "./number-format";

/**
 * Porządek dokumentów po numerze — tak, jak leżą w rejestrze.
 *
 * Zwykłe sortowanie tekstu tu nie działa: „10/08/2026" wypada przed
 * „2/08/2026". Samo porównanie liczb też nie: przy domyślnym wzorze licznik
 * stoi z przodu i wraca do jedynki co miesiąc, więc „1/09/2026" wyszłoby przed
 * „2/08/2026". Dlatego klucz idzie za wzorem numeracji organizacji: najpierw
 * okres, w którym licznik biegnie (miesiąc, rok albo cały rejestr), potem
 * numer porządkowy w tym okresie.
 *
 * Numer, którego wzór nie odczyta — nadany przed zmianą formatu albo
 * poprawiony ręcznie na „12/2026 KOR" — zostaje w swoim okresie, za numerami
 * odczytanymi, ułożony tak, jak czyta go człowiek („2" przed „10").
 *
 * Szkice idą na koniec w obu kierunkach: numeru jeszcze nie mają, więc nie ma
 * ich gdzie wstawić w rejestrze.
 */

export type NumberSortable = {
  number: string;
  issueDate: Date;
  status: string;
};

const collator = new Intl.Collator("pl", { numeric: true, sensitivity: "base" });

function isDraft(invoice: NumberSortable): boolean {
  return invoice.status === "DRAFT" || invoice.number.startsWith(DRAFT_NUMBER_PREFIX);
}

export function sortByInvoiceNumber<T extends NumberSortable>(
  invoices: T[],
  template: string,
  direction: "asc" | "desc",
): T[] {
  const keyed = invoices.map((invoice) => ({
    invoice,
    draft: isDraft(invoice),
    period: numberingPeriodBounds(template, invoice.issueDate).gte?.getTime() ?? 0,
    sequence: sequenceInNumber(invoice.number, template, invoice.issueDate),
  }));

  const sign = direction === "asc" ? 1 : -1;

  keyed.sort((a, b) => {
    if (a.draft !== b.draft) return a.draft ? 1 : -1;
    if (a.draft) return collator.compare(a.invoice.number, b.invoice.number);

    if (a.period !== b.period) return sign * (a.period - b.period);

    // Odczytane przed nieodczytanymi — w obu kierunkach, bo nieodczytany
    // numer nie ma miejsca w ciągu, tylko na jego końcu.
    if ((a.sequence === null) !== (b.sequence === null)) return a.sequence === null ? 1 : -1;
    if (a.sequence !== null && b.sequence !== null && a.sequence !== b.sequence) {
      return sign * (a.sequence - b.sequence);
    }

    // Ten sam numer porządkowy w dwóch seriach („R 3/08/2026" i „3/08/2026")
    // albo dwa numery nieodczytane — rozstrzyga zapis.
    return sign * collator.compare(a.invoice.number, b.invoice.number);
  });

  return keyed.map((entry) => entry.invoice);
}

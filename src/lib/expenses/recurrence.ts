import { nextOccurrence, recurrenceAnchor } from "@/lib/expenses/schedule";
import { prisma } from "@/lib/prisma";

/**
 * Koszty cykliczne.
 *
 * Wzorcem serii jest zawsze jej najnowsza pozycja: to ona trzyma cykl i datę
 * kolejnego naliczenia. Przy naliczeniu powstaje nowa pozycja z tymi samymi
 * danymi i to ona przejmuje cykl, a poprzednia zostaje zwykłym kosztem. Dzięki
 * temu zmiana kwoty w bieżącym miesiącu (gaz podrożał w październiku) przechodzi
 * na kolejne miesiące, ale nie przepisuje tych, które już minęły — gdyby wzorcem
 * była pierwsza pozycja, poprawka nowej stawki zmieniłaby też wrzesień.
 *
 * Wszystkie pozycje serii wskazują przez `recurringFromId` na pierwszą, więc
 * raport, filtry i sumy nie muszą wiedzieć o cykliczności niczego. Usunięcie
 * wzorca zatrzymuje naliczanie, nie kasując tego, co już z konta wyszło.
 */

/**
 * Ile wystąpień dokładamy jednemu wzorcowi w jednym przebiegu.
 *
 * Limit chroni przed kosztem „co 1 dzień" z datą sprzed lat, który przy
 * pierwszym otwarciu strony wygenerowałby tysiące wierszy w jednym żądaniu.
 * Reszta dolicza się przy kolejnym wejściu — przebieg jest wznawialny.
 */
const MAX_PER_RUN = 60;

/** Ile wzorców obsługujemy naraz — reszta poczeka do następnego przebiegu. */
const MAX_TEMPLATES = 200;

export type AccrualResult = { created: number };

/**
 * Dolicza wystąpienia kosztów cyklicznych, którym minął termin.
 *
 * Idempotentne: wzorzec zajmujemy warunkowym `updateMany` w tej samej
 * transakcji, w której powstaje nowa pozycja. Dwa równoległe przebiegi — nocny
 * cron i otwarta strona kosztów — nie zdublują pozycji, bo drugi z nich zobaczy,
 * że wzorzec oddał już cykl dalej, i nie zajmie niczego.
 */
export async function accrueRecurringExpenses(
  organizationId: string,
  now: Date = new Date(),
): Promise<AccrualResult> {
  // Termin to data bez godziny, tak jak `paidAt` — koszt z dzisiejszą datą
  // ma się naliczyć dzisiaj, a nie dopiero o północy następnego dnia.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const templates = await prisma.expense.findMany({
    where: {
      organizationId,
      recurrence: { not: null },
      recurrenceNextAt: { lte: today },
    },
    include: { recurringFrom: { select: { paidAt: true } } },
    take: MAX_TEMPLATES,
  });

  let created = 0;

  for (const template of templates) {
    const recurrence = template.recurrence;
    if (!recurrence || !template.recurrenceNextAt) continue;

    const firstId = template.recurringFromId ?? template.id;
    const anchor = recurrenceAnchor(template.paidAt, template.recurringFrom?.paidAt ?? null);

    let holderId = template.id;
    let due = template.recurrenceNextAt;

    for (let step = 0; step < MAX_PER_RUN && due <= today; step += 1) {
      const after = nextOccurrence(anchor, due, recurrence, template.recurrenceEveryDays);
      const paidAt = due;
      const currentHolder = holderId;

      const next = await prisma.$transaction(async (tx) => {
        const { count } = await tx.expense.updateMany({
          // `recurrenceNextAt: due` w warunku to całe zabezpieczenie: zapis
          // przejdzie tylko wtedy, gdy nikt inny nie zajął tego terminu.
          where: { id: currentHolder, recurrenceNextAt: due },
          data: { recurrence: null, recurrenceEveryDays: null, recurrenceNextAt: null },
        });
        if (count === 0) return null;

        return tx.expense.create({
          data: {
            organizationId: template.organizationId,
            propertyId: template.propertyId,
            category: template.category,
            amountGrosze: template.amountGrosze,
            paidAt,
            description: template.description,
            vendor: template.vendor,
            // Numer dokumentu zostaje przy poprzedniej pozycji: kolejne
            // wystąpienie ma własną fakturę od dostawcy, a przepisany numer
            // wskazywałby na papier sprzed miesiąca.
            documentRef: null,
            notes: template.notes,
            recurrence,
            recurrenceEveryDays: template.recurrenceEveryDays,
            recurrenceNextAt: after,
            recurringFromId: firstId,
          },
          select: { id: true },
        });
      });

      if (!next) break;

      created += 1;
      holderId = next.id;
      due = after;
    }
  }

  return { created };
}

import { nextOccurrence } from "@/lib/expenses/schedule";
import { prisma } from "@/lib/prisma";

/**
 * Koszty cykliczne.
 *
 * Wpisana ręcznie pozycja jest wzorcem: trzyma cykl i datę kolejnego
 * naliczenia. Kolejne wystąpienia to zwykłe koszty z wypełnionym
 * `recurringFromId` — dzięki temu raport, filtry i sumy nie muszą wiedzieć
 * o cykliczności niczego, a usunięcie wzorca zatrzymuje naliczanie, nie
 * kasując tego, co już z konta wyszło.
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
 * Idempotentne: termin zajmujemy warunkowym `updateMany` w tej samej
 * transakcji, w której powstaje wiersz. Dwa równoległe przebiegi — nocny cron
 * i otwarta strona kosztów — nie zdublują pozycji, bo drugi z nich zobaczy
 * `recurrenceNextAt` już przesunięte i nie zajmie niczego.
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
    take: MAX_TEMPLATES,
  });

  let created = 0;

  for (const template of templates) {
    const recurrence = template.recurrence;
    if (!recurrence || !template.recurrenceNextAt) continue;

    let due = template.recurrenceNextAt;

    for (let step = 0; step < MAX_PER_RUN && due <= today; step += 1) {
      const after = nextOccurrence(template.paidAt, due, recurrence, template.recurrenceEveryDays);
      const paidAt = due;

      const claimed = await prisma.$transaction(async (tx) => {
        const { count } = await tx.expense.updateMany({
          // `recurrenceNextAt: due` w warunku to całe zabezpieczenie: zapis
          // przejdzie tylko wtedy, gdy nikt inny nie zajął tego terminu.
          where: { id: template.id, recurrenceNextAt: due },
          data: { recurrenceNextAt: after },
        });
        if (count === 0) return false;

        await tx.expense.create({
          data: {
            organizationId: template.organizationId,
            propertyId: template.propertyId,
            category: template.category,
            amountGrosze: template.amountGrosze,
            paidAt,
            description: template.description,
            vendor: template.vendor,
            // Numer dokumentu zostaje przy wzorcu: kolejne wystąpienie ma
            // własną fakturę od dostawcy, a przepisany numer wskazywałby
            // na papier sprzed miesiąca.
            documentRef: null,
            notes: template.notes,
            recurringFromId: template.id,
          },
        });

        return true;
      });

      if (!claimed) break;

      created += 1;
      due = after;
    }
  }

  return { created };
}

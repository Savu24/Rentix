import type { SubscriptionPlan } from "@/generated/prisma/enums";
import type { ApiOwnerContext } from "@/lib/auth/session";
import { fill, pluralize } from "@/lib/i18n/format";

/**
 * Komunikat o wyczerpanym limicie umów.
 *
 * Osobno od tras, bo padają go dwie: zakładanie umowy i przywracanie jej
 * z archiwum. Zdanie musi być w obu identyczne — inaczej ten sam próg
 * tłumaczyłby się raz tak, raz inaczej.
 *
 * Mówi trzy rzeczy naraz: który plan, jaki próg i co z tym zrobić. Samo
 * „limit wyczerpany" zostawiałoby użytkownika przy formularzu, którego nie da
 * się zapisać, bez podpowiedzi, że wyjściem jest archiwum.
 */
export function leaseLimitMessage(
  auth: ApiOwnerContext,
  plan: SubscriptionPlan,
  limit: number,
): string {
  return fill(auth.d.panel.api.leaseLimitReached, {
    plan: auth.d.panel.shell.plans[plan],
    limit,
    noun: pluralize(auth.locale, limit, auth.d.panel.api.countable.leases),
  });
}

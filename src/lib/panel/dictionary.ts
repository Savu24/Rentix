import { cache } from "react";

import { requireOwnerSession } from "@/lib/auth/session";
import { getDictionary, localeContext, type Dictionary, type Locale } from "@/lib/i18n";
import { organizationLocale } from "@/lib/i18n/server";

/**
 * Język panelu dla komponentów serwerowych.
 *
 * Zamiast przepychać słownik propsem przez kilkadziesiąt komponentów, każdy
 * pyta o niego sam. `cache` z Reacta zwija to do jednego zapytania na żądanie,
 * więc karta nieruchomości w pętli nie odpytuje bazy raz na wiersz.
 *
 * Wołać wolno wyłącznie wewnątrz panelu: w środku siedzi `requireOwnerSession`,
 * które poza zalogowanym właścicielem przekierowuje na logowanie.
 */
export const panelLocale = cache(async (): Promise<Locale> => {
  const session = await requireOwnerSession();
  return organizationLocale(session.user.organizationId);
});

export async function panelDictionary(): Promise<Dictionary> {
  return getDictionary(await panelLocale());
}

/** Kontekst dla schematów walidacji po stronie serwera panelu. */
export async function panelValidationContext() {
  return localeContext(await panelLocale());
}

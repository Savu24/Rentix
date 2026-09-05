import { cookies, headers } from "next/headers";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localeFromAcceptLanguage,
  type Locale,
} from "./config";

/**
 * Wybór wersji krajowej po stronie serwera.
 *
 * Dwa różne pytania, dwie różne odpowiedzi:
 *
 * • Część publiczna pyta o **odwiedzającego** — decyduje ciasteczko, potem
 *   nagłówek przeglądarki. To ta sama kolejność co w middlewarze.
 * • Panel pyta o **konto** — decyduje `Organization.locale`, bo od niego zależy
 *   też rodzaj faktury. Anglik zalogowany z polskiej kawiarni ma widzieć swoje
 *   konto po angielsku, niezależnie od tego, co mówi przeglądarka.
 */

/** Wersja odwiedzającego — do stron publicznych i adresów przekierowań. */
export async function requestLocale(): Promise<Locale> {
  // Middleware już to rozstrzygnął — razem z prefiksem w adresie, którego
  // komponent serwerowy sam nie widzi.
  const fromMiddleware = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromMiddleware)) return fromMiddleware;

  // Zapasowo, gdy middleware nie objął trasy (np. wywołanie z testu).
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  const acceptLanguage = (await headers()).get("accept-language");
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/**
 * Wersja konta. `cache` z Reacta zwija to do jednego zapytania na żądanie,
 * mimo że pyta o nią layout panelu i każda strona z osobna.
 */
export const organizationLocale = cache(async (organizationId: string): Promise<Locale> => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { locale: true },
  });

  // Kolumna jest zwykłym tekstem, więc wartość spoza listy (ręczna poprawka
  // w bazie, konto z przyszłej wersji) nie może wywalić panelu.
  return isLocale(organization?.locale) ? organization.locale : DEFAULT_LOCALE;
});

"use client";

import { useEffect } from "react";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_META,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Dociąga `<html lang>` i ciasteczko kraju do języka konta.
 *
 * Panel nie ma prefiksu w adresie, więc `layout.tsx` w korzeniu renderuje go
 * z ostatnią wersją, którą oglądał odwiedzający. Zwykle to ta sama, ale nie
 * musi: Brytyjczyk, który zajrzał po drodze na `/pl`, dostałby angielski panel
 * w polskim `lang` — czytnik ekranu przeczytałby go wtedy polską wymową.
 *
 * Poprawka na kliencie wystarcza, bo dotyczy tylko atrybutu i preferencji;
 * treść panelu jest już po stronie serwera we właściwym języku. Zapisane
 * ciasteczko sprawia, że kolejne żądania trafiają od razu dobrze — i że
 * kliknięcie w logo prowadzi na stronę główną własnego kraju.
 */
export function PanelLocaleSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    // W `lang` idzie kod języka („en-GB"), a nie skrót kraju z adresu („uk").
    const htmlLang = LOCALE_META[locale].htmlLang;
    if (document.documentElement.lang !== htmlLang) {
      document.documentElement.lang = htmlLang;
    }

    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  }, [locale]);

  return null;
}

"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/client";
import { LOCALE_META, LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Przełącznik wersji krajowej: dwa skróty obok siebie, aktywny podświetlony.
 *
 * Skrót kraju, nie flaga i nie kod języka. Flaga myli — angielski to nie tylko
 * Wielka Brytania — a „EN" nie mówi nic o cenniku, który jest w funtach.
 *
 * Prowadzi zawsze na stronę główną drugiej wersji, bo podstrony mają w każdym
 * kraju własne slugi (`/pl/logowanie` vs `/uk/login`) i nie ma między nimi
 * odwzorowania jeden do jednego. Dlatego przełącznik stoi na stronie głównej,
 * a nie w nagłówku formularza logowania — tam byłby przyciskiem, który
 * wyrzuca z rozpoczętej czynności.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale: active, d } = useI18n();

  return (
    <nav
      aria-label={d.common.switchLocaleLabel}
      className={cn(
        "inline-flex h-9 items-center rounded-control border border-border bg-surface p-0.5",
        className,
      )}
    >
      {LOCALES.map((locale) => (
        <LocaleLink
          key={locale}
          locale={locale}
          active={locale === active}
          href={`/${locale}`}
        />
      ))}
    </nav>
  );
}

function LocaleLink({
  locale,
  active,
  href,
}: {
  locale: Locale;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      hrefLang={LOCALE_META[locale].htmlLang}
      aria-current={active ? "true" : undefined}
      title={LOCALE_META[locale].label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-[7px] px-2",
        "font-mono text-[11.5px] font-medium uppercase tracking-[0.04em]",
        "transition-colors",
        active
          ? "bg-surface-alt text-fg"
          : "text-muted hover:bg-surface-alt hover:text-fg",
      )}
    >
      {locale}
    </Link>
  );
}

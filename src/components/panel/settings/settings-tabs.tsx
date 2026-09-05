"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/client";

/**
 * Pasek zakładek ustawień.
 *
 * Zakładki są trasami, nie stanem komponentu. Trzy powody, wszystkie
 * praktyczne: każda zakładka zostaje komponentem serwerowym i dociąga tylko
 * swoje dane (edytor treści potrzebuje szablonów, których reszta ustawień nie
 * potrzebuje), zapis formularza z `router.refresh()` nie przerzuca użytkownika
 * na pierwszą zakładkę, a do konkretnej sekcji da się odesłać linkiem z alertu.
 *
 * Klient tylko z powodu `usePathname` — sam pasek nie trzyma żadnego stanu.
 */

export function SettingsTabs() {
  const { d } = useI18n();
  const pathname = usePathname();

  const tabs = [
    { href: "/panel/ustawienia", label: d.panel.tabs.settingsOrganization },
    { href: "/panel/ustawienia/powiadomienia", label: d.panel.tabs.settingsNotifications },
    { href: "/panel/ustawienia/wiadomosci", label: d.panel.tabs.settingsMessages },
    { href: "/panel/ustawienia/konto", label: d.panel.tabs.settingsAccount },
  ];

  return (
    <nav
      aria-label={d.panel.tabs.settingsAria}
      /*
        Poziome przewijanie zamiast zwijania do listy rozwijanej: cztery pozycje
        mieszczą się w jednym rzucie oka, a lista rozwijana chowa nazwy sekcji
        za kliknięciem i każe je pamiętać.
      */
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full gap-1 border-b border-border">
        {tabs.map((tab) => {
          // Zakładka „Organizacja" siedzi pod ścieżką bazową, więc dopasowanie
          // przez prefiks zapaliłoby ją na każdej podstronie ustawień.
          const active =
            tab.href === "/panel/ustawienia"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-accent font-semibold text-fg"
                    : "border-transparent text-muted hover:border-border hover:text-fg"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

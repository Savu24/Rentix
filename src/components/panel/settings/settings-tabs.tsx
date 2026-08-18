"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

const TABS = [
  { href: "/panel/ustawienia", label: "Organizacja" },
  { href: "/panel/ustawienia/powiadomienia", label: "Powiadomienia" },
  { href: "/panel/ustawienia/wiadomosci", label: "Wiadomości" },
  { href: "/panel/ustawienia/konto", label: "Konto" },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sekcje ustawień"
      /*
        Poziome przewijanie zamiast zwijania do listy rozwijanej: cztery pozycje
        mieszczą się w jednym rzucie oka, a lista rozwijana chowa nazwy sekcji
        za kliknięciem i każe je pamiętać.
      */
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full gap-1 border-b border-border">
        {TABS.map((tab) => {
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

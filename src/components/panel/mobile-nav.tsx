"use client";

import { MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PlanLockMark } from "@/components/panel/plan-lock-mark";
import { useI18n } from "@/lib/i18n/client";
import {
  isNavItemActive,
  MOBILE_NAV,
  MOBILE_OVERFLOW_NAV,
  navLabel,
} from "@/lib/panel/nav";
import { cn } from "@/lib/utils";

/**
 * Dolny pasek nawigacji na telefonie.
 *
 * `sticky bottom-0` zamiast `fixed`: pasek zostaje w normalnym przepływie
 * dokumentu, więc nie zasłania końca treści i nie wymaga sztucznego paddingu
 * na dole każdej strony.
 *
 * Cztery skróty plus „Więcej”. Pasek nie rośnie razem z liczbą modułów —
 * przy siedmiu pozycjach etykiety zrobiłyby się nieczytelne, a wcześniejsza
 * sztywna lista pięciu adresów po prostu gubiła nowe zakładki.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { d } = useI18n();
  const t = d.panel.shell;
  const [open, setOpen] = useState(false);

  // Zmiana strony zamyka arkusz — inaczej zostawałby otwarty nad nowym
  // widokiem, bo nawigacja w Next.js nie odmontowuje tego komponentu.
  useEffect(() => setOpen(false), [pathname]);

  const overflowActive = MOBILE_OVERFLOW_NAV.some((item) => isNavItemActive(item, pathname));

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-fg/30"
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-card border-t border-border bg-surface p-4 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-fg">{t.menu}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.closeMenu}
                className="rounded-btn p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-0.5">
              {MOBILE_OVERFLOW_NAV.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;

                if (item.soon) {
                  return (
                    <span
                      key={item.href}
                      aria-disabled
                      className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-medium text-muted/60"
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      {navLabel(item, d.panel.nav)}
                      <span className="ml-auto text-[10px] uppercase tracking-wide">{t.soon}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-control px-3 py-3 text-sm font-medium transition-colors",
                      active ? "bg-accent-soft text-accent" : "text-fg hover:bg-surface-alt",
                    )}
                  >
                    <Icon
                      className={cn("h-[18px] w-[18px] shrink-0", !active && "text-muted")}
                      aria-hidden
                    />
                    {navLabel(item, d.panel.nav)}
                    {item.feature ? (
                      <PlanLockMark feature={item.feature} className="ml-auto" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label={t.mobileNavAria}
        className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-surface px-1.5 py-2 lg:hidden"
      >
        {MOBILE_NAV.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          const label = navLabel(item, d.panel.nav, true);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-btn py-1 transition-colors",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="h-[17px] w-[17px]" aria-hidden />
              <span className="text-[10.5px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}

        {/* „Więcej" świeci się, gdy jesteś na którejkolwiek ze stron spod
            niego — inaczej pasek sugerowałby, że stoisz poza nawigacją. */}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-btn py-1 transition-colors",
            open || overflowActive ? "text-accent" : "text-muted",
          )}
        >
          <MoreHorizontal className="h-[17px] w-[17px]" aria-hidden />
          <span className="text-[10.5px] font-medium leading-none">{t.more}</span>
        </button>
      </nav>
    </>
  );
}

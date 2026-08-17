"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, MOBILE_NAV } from "@/lib/panel/nav";
import { cn } from "@/lib/utils";

/**
 * Dolny pasek nawigacji na telefonie.
 *
 * `sticky bottom-0` zamiast `fixed`: pasek zostaje w normalnym przepływie
 * dokumentu, więc nie zasłania końca treści i nie wymaga sztucznego paddingu
 * na dole każdej strony.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nawigacja mobilna"
      className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-surface px-1.5 py-2 lg:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = isNavItemActive(item, pathname);
        const Icon = item.icon;
        const label = item.shortLabel ?? item.label;

        const content = (
          <>
            <Icon className="h-[17px] w-[17px]" aria-hidden />
            <span className="text-[10.5px] font-medium leading-none">{label}</span>
          </>
        );

        if (item.soon) {
          return (
            <span
              key={item.href}
              aria-disabled
              className="flex flex-1 cursor-not-allowed flex-col items-center gap-1 py-1 text-muted/50"
            >
              {content}
            </span>
          );
        }

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
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

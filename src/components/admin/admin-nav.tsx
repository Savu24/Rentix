"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV, isAdminNavItemActive } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

/**
 * Pasek sekcji panelu administratora.
 *
 * Poziomo, a nie w kolumnie jak w panelu klienta: sekcji jest pięć i żadna
 * nie urośnie, a każda strona pod spodem to szeroka tabela, której boczna
 * kolumna zabierałaby miejsce potrzebne na kolumny danych.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sekcje panelu administratora" className="flex gap-1 overflow-x-auto">
      {ADMIN_NAV.map((item) => {
        const active = isAdminNavItemActive(item, pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent2-soft text-accent2" : "text-muted hover:bg-surface-alt hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

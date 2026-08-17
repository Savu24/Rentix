"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Przełącznik między wpływami a kosztami.
 *
 * Obie strony to ta sama sprawa — pieniądze — więc siedzą pod „Finansami"
 * zamiast rozpychać nawigację boczną o kolejną pozycję.
 */
const TABS = [
  { href: "/panel/finanse", label: "Dokumenty" },
  { href: "/panel/finanse/koszty", label: "Koszty" },
];

export function FinanceTabs() {
  const pathname = usePathname();

  // „/panel/finanse" jest prefiksem obu ścieżek, więc o zakładce decyduje to,
  // czy jesteśmy w kosztach — inaczej „Dokumenty" świeciłyby się także tam.
  const onExpenses = pathname.startsWith("/panel/finanse/koszty");

  return (
    <nav aria-label="Sekcje finansów" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.href === "/panel/finanse/koszty" ? onExpenses : !onExpenses;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

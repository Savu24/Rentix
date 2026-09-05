"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Przełącznik między wpływami a kosztami.
 *
 * Obie strony to ta sama sprawa — pieniądze — więc siedzą pod „Finansami"
 * zamiast rozpychać nawigację boczną o kolejną pozycję.
 */
export function FinanceTabs() {
  const { d } = useI18n();
  const pathname = usePathname();

  const tabs = [
    { href: "/panel/finanse", label: d.panel.tabs.financeDocuments },
    { href: "/panel/finanse/koszty", label: d.panel.tabs.financeExpenses },
  ];

  // „/panel/finanse" jest prefiksem obu ścieżek, więc o zakładce decyduje to,
  // czy jesteśmy w kosztach — inaczej „Dokumenty" świeciłyby się także tam.
  const onExpenses = pathname.startsWith("/panel/finanse/koszty");

  return (
    <nav aria-label={d.panel.tabs.financeAria} className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
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

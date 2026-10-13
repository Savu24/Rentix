"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Zakładki wewnątrz karty (redesign/_generator/lib.mjs, `tabs`): podkreślenie
 * aktywnej, licznik obok etykiety. Treść każdej zakładki renderuje serwer —
 * tu przełącza się tylko widoczność.
 */
export function CardTabs({
  tabs,
  label,
}: {
  tabs: { id: string; label: string; count?: number; content: React.ReactNode }[];
  /** Nazwa grupy zakładek dla czytnika ekranu. */
  label: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const baseId = useId();

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label={label} className="flex gap-6 border-b border-border">
        {tabs.map((tab) => {
          const selected = tab.id === active;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-${tab.id}-tab`}
              aria-selected={selected}
              aria-controls={`${baseId}-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px flex h-10 items-center gap-2 border-b-2 text-sm transition-colors",
                selected
                  ? "border-accent font-semibold text-fg"
                  : "border-transparent font-medium text-muted hover:text-fg",
              )}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <Badge size="sm" tone={selected ? "accent" : "neutral"}>
                  {tab.count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-${tab.id}`}
          aria-labelledby={`${baseId}-${tab.id}-tab`}
          hidden={tab.id !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

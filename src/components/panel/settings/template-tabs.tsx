"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { EditableNotificationType } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * Przełącznik rodzaju wiadomości nad edytorem (redesign/19-ustawienia-wiadomosci.svg).
 *
 * Edytory wszystkich rodzajów są w drzewie cały czas, a nieaktywne chowa
 * atrybut `hidden`: przełączenie na chwilę nie może zgubić niezapisanego
 * tekstu w formularzu obok.
 */
export function TemplateTabs({
  types,
  aside,
  children,
}: {
  types: EditableNotificationType[];
  /** Ikona „i" przy przełączniku. */
  aside?: React.ReactNode;
  /** Edytory w tej samej kolejności, co `types`. */
  children: React.ReactNode[];
}) {
  const { d } = useI18n();
  const labels = d.panel.settings.notifications.types;
  const [active, setActive] = useState(types[0]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label={d.panel.panelMisc.templateEditor.typeAria}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:w-fit lg:gap-0 lg:rounded-[9px] lg:bg-surface-alt lg:p-[3px]"
        >
          {types.map((type) => {
            const selected = type === active;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                id={`tpl-tab-${type}`}
                aria-selected={selected}
                aria-controls={`tpl-panel-${type}`}
                onClick={() => setActive(type)}
                className={cn(
                  "h-[34px] shrink-0 rounded-full px-3.5 text-[13.5px] font-[550] whitespace-nowrap transition-colors",
                  "lg:h-[30px] lg:rounded-[7px] lg:px-3 lg:text-[13px]",
                  selected
                    ? "bg-fg text-bg lg:bg-surface lg:text-fg lg:shadow-btn"
                    : "border border-border-strong bg-surface text-fg lg:border-0 lg:bg-transparent lg:text-muted lg:hover:text-fg",
                )}
              >
                {labels[type].label}
              </button>
            );
          })}
        </div>
        {aside}
      </div>

      {types.map((type, index) => (
        <div
          key={type}
          role="tabpanel"
          id={`tpl-panel-${type}`}
          aria-labelledby={`tpl-tab-${type}`}
          hidden={type !== active}
        >
          {children[index]}
        </div>
      ))}
    </div>
  );
}

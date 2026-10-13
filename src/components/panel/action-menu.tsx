"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { usePopover } from "@/components/panel/use-popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  label: string;
  icon?: LucideIcon;
  /** Akcja niszcząca — czerwona etykieta. */
  danger?: boolean;
  disabled?: boolean;
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

/**
 * Menu „⋯" z akcjami wiersza albo ekranu (redesign: przycisk `more`).
 *
 * Akcje rzadkie i niszczące schodzą tutaj, żeby przy każdym wierszu nie
 * stała ściana ikon. Główna akcja zostaje na wierzchu.
 */
export function ActionMenu({
  items,
  label,
  align = "end",
  size = "sm",
}: {
  items: ActionMenuItem[];
  /** Nazwa przycisku dla czytnika ekranu („Więcej akcji: Pokój 1"). */
  label: string;
  align?: "start" | "end";
  size?: "sm" | "md";
}) {
  const { open, setOpen, close, rootRef, triggerRef } = usePopover();

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant={size === "md" ? "secondary" : "ghost"}
        size="icon"
        className={size === "sm" ? "size-8" : undefined}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="size-[18px]" aria-hidden />
      </Button>

      {open ? (
        <ul
          className={cn(
            "absolute top-full z-50 mt-1.5 min-w-48 rounded-card bg-surface p-1.5 shadow-float",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const className = cn(
              "flex h-10 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium whitespace-nowrap transition-colors",
              item.danger ? "text-bad hover:bg-bad-soft" : "text-fg hover:bg-hover",
              item.disabled && "pointer-events-none opacity-50",
            );
            const content = (
              <>
                {Icon ? (
                  <Icon
                    className={cn("size-[18px] shrink-0", item.danger ? "text-bad" : "text-muted")}
                    aria-hidden
                  />
                ) : null}
                {item.label}
              </>
            );

            return (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} className={className} onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={className}
                    disabled={item.disabled}
                    onClick={() => {
                      close();
                      item.onSelect?.();
                    }}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

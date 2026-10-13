"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Przełącznik wł./wył. (redesign/_generator/lib.mjs, `toggle`): tor 36×20,
 * gałka 16 px. Przycisk z `role="switch"`, więc czytnik ekranu mówi „włączone /
 * wyłączone", a spacja i Enter działają bez dopisywania obsługi klawiatury.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  /** Nazwa dla czytnika ekranu, gdy widocznej etykiety nie ma obok. */
  label?: string;
  id?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed",
        checked ? "bg-accent" : "bg-border-strong",
        disabled && "opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-on-color shadow-btn transition-[left]",
          checked ? "left-[18px]" : "left-0.5",
        )}
        aria-hidden
      />
    </button>
  );
}

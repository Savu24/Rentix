"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Przełącznik motywu — jedno kliknięcie, wybór zapamiętany w localStorage
 * i w ciasteczku (żeby serwer renderował od razu właściwy motyw).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Do czasu montażu nie znamy motywu wybranego przez skrypt w <head>,
  // więc ikona renderuje się dopiero po stronie klienta — inaczej React
  // zgłosiłby niezgodność z HTML-em z serwera.
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const label = isDark ? "Włącz tryb jasny" : "Włącz tryb ciemny";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-control",
        "border border-border bg-surface text-muted",
        "transition-colors hover:bg-surface-alt hover:text-fg",
        "active:scale-[0.98]",
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

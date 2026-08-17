"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  isTheme,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function persist(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Tryb prywatny może blokować localStorage — ciasteczko poniżej wystarczy.
  }
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  /** Motyw odczytany z ciasteczka po stronie serwera. */
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    persist(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }, [setTheme]);

  /**
   * Po hydracji React przywraca `data-theme` do wartości wyrenderowanej przez
   * serwer, kasując wybór skryptu z <head>. Przy pierwszej wizycie w trybie
   * ciemnym objawia się to przeskokiem z ciemnego na jasny.
   *
   * Dlatego po zamontowaniu ustalamy motyw jeszcze raz — z localStorage,
   * a w jego braku z preferencji systemowej — i narzucamy go autorytatywnie.
   * `initialTheme` z ciasteczka sprawia, że w powtórnych wizytach warunek
   * jest fałszywy i nic się nie przerysowuje.
   */
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // localStorage niedostępny — zdecyduje preferencja systemowa.
    }

    const effective: Theme = isTheme(stored)
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    if (
      effective !== theme ||
      document.documentElement.getAttribute("data-theme") !== effective
    ) {
      setTheme(effective);
    }
    // Wyłącznie przy montowaniu — dalej źródłem prawdy jest ten komponent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme musi być użyty wewnątrz <ThemeProvider>.");
  }
  return context;
}

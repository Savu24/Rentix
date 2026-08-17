import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bez tego Next szuka korzenia projektu w górę drzewa i trafia na obcy
   * package-lock.json w katalogu domowym, po czym śledzi pliki względem
   * niego. Przy wdrożeniu kończy się to brakującymi plikami w bundlu.
   */
  outputFileTracingRoot: path.resolve(import.meta.dirname),

  /**
   * Wskaźnik dev toolsów Next.js domyślnie siada w lewym dolnym rogu — czyli
   * na bloku użytkownika w sidebarze panelu. Przesuwamy go w wolny róg zamiast
   * wyłączać, bo pokazuje aktywność builda i błędy renderowania.
   * Widoczny wyłącznie w `next dev`; do builda produkcyjnego nie trafia.
   */
  devIndicators: { position: "bottom-right" },

  /**
   * Generator PDF czyta pliki TTF z dysku w czasie żądania, więc analiza
   * importów ich nie wykryje — trzeba wskazać je wprost, inaczej na produkcji
   * endpoint padnie na „ENOENT: Inter_400Regular.ttf".
   */
  outputFileTracingIncludes: {
    "/api/leases/[id]/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    "/api/invoices/[id]/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    "/api/invoices/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
  },
};

export default nextConfig;

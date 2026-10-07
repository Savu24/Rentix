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
   * Nagłówki bezpieczeństwa na każdej odpowiedzi.
   *
   * - `frame-ancestors 'none'` + `X-Frame-Options` — panelu nie da się osadzić
   *   w ramce na obcej stronie, więc nikt nie podsunie użytkownikowi
   *   niewidocznego przycisku „usuń" pod własnym (clickjacking). Podgląd maila
   *   w edytorze szablonów to `srcDoc`, którego to nie dotyczy.
   * - `Referrer-Policy` — adres zaproszenia niesie token w ścieżce; na obce
   *   domeny wychodzi sam origin, bez ścieżki.
   * - `nosniff` — przeglądarka nie zgaduje typu pliku wbrew nagłówkowi.
   * - HSTS — po pierwszej wizycie tylko HTTPS. Przeglądarki ignorują go
   *   na `http://localhost`, więc praca lokalna działa jak dotąd.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  /**
   * Generator PDF czyta pliki TTF z dysku w czasie żądania, więc analiza
   * importów ich nie wykryje — trzeba wskazać je wprost, inaczej na produkcji
   * endpoint padnie na „ENOENT: Inter_400Regular.ttf".
   */
  outputFileTracingIncludes: {
    "/api/leases/[id]/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    "/api/invoices/[id]/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    "/api/invoices/pdf": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    // Wysyłka dołącza PDF, więc te trasy też czytają fonty z dysku.
    "/api/invoices/[id]/send": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
    "/api/cron/billing": ["./node_modules/@expo-google-fonts/inter/**/*.ttf"],
  },
};

export default nextConfig;

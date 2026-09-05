import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { env } from "@/lib/env";
import { getDictionary, LOCALE_META } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { requestLocale } from "@/lib/i18n/server";
import { isTheme, THEME_COOKIE, themeInitScript, type Theme } from "@/lib/theme";

import "./globals.css";

// `latin-ext` jest konieczny dla polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż) —
// bez niego nagłówki wypadałyby do fontu systemowego w połowie wyrazu.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const t = getDictionary(locale).marketing;

  return {
    title: {
      default: t.metaTitle,
      template: "%s · Rentix",
    },
    description: t.metaDescription,
    applicationName: "Rentix",
    /*
      Adres bazowy podglądów linków. Bierzemy go ze zwalidowanego `env`, a nie
      wprost z `process.env`: panel hostingu pozwala dodać zmienną z pustą
      wartością, a pusty string nie jest `undefined`, więc `??` go nie łapie
      i `new URL("")` wywracał budowanie komunikatem „Invalid URL".
    */
    metadataBase: new URL(env.APP_URL ?? env.AUTH_URL ?? "http://localhost:3000"),
    /*
      Ikona na ekran główny iPhone'a — celowo z `public/`, nie z konwencji
      `src/app/apple-icon.png`.

      Konwencja Nexta serwuje plik pod adresem ze skrótem treści
      (`/apple-icon.png?9f7593f6…`). Safari na iOS bywa, że przy takim adresie
      ikony nie pobiera, i wtedy zostaje szara kafelka z pierwszą literą tytułu —
      dokładnie to, co widać po dodaniu skrótu. Plik w `public/` ma adres stały
      i bez znaku zapytania.

      Nazwa `apple-touch-icon.png` w korzeniu domeny jest drugim zabezpieczeniem:
      iOS sam próbuje pobrać ten adres, gdy nie uda mu się skorzystać ze
      znacznika w HTML-u.
    */
    icons: {
      // Bez `icon` — `favicon.ico` w `src/app/` Next wystawia sam, a wpisanie go
      // tutaj dokładało drugi, identyczny znacznik.
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      title: "Rentix",
      capable: true,
      statusBarStyle: "default",
    },
    /*
      `capable: true` wystawia dziś wyłącznie znormalizowany `mobile-web-app-capable`,
      a Safari na iOS nadal czyta wariant z przedrostkiem `apple-`. Bez niego skrót
      otwiera się w zwykłej karcie Safari zamiast jako osobna aplikacja.
    */
    other: {
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7EF" },
    { media: "(prefers-color-scheme: dark)", color: "#10201A" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const stored = cookieStore.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(stored) ? stored : "light";

  /*
    Wersja krajowa dla `lang` i dla komponentów klienckich. Na stronach
    publicznych bierze się z prefiksu w adresie (podaje go middleware
    nagłówkiem), w panelu nadpisuje ją layout panelu wartością z ustawień konta —
    zagnieżdżony `I18nProvider` wygrywa z tym tutaj.
  */
  const locale = await requestLocale();

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        {/* Musi wykonać się przed pierwszym malowaniem — stąd inline zamiast <Script>. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${bricolage.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
          <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

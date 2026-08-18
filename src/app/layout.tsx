import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { env } from "@/lib/env";
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

export const metadata: Metadata = {
  title: {
    default: "Rentix — zarządzanie najmem bez Excela",
    template: "%s · Rentix",
  },
  description:
    "Umowy, płatności, zgłoszenia usterek i raporty finansowe w jednym prostym miejscu. Dla właścicieli mieszkań i zarządców nieruchomości w Polsce.",
  applicationName: "Rentix",
  /*
    Adres bazowy podglądów linków. Bierzemy go ze zwalidowanego `env`, a nie
    wprost z `process.env`: panel hostingu pozwala dodać zmienną z pustą
    wartością, a pusty string nie jest `undefined`, więc `??` go nie łapie
    i `new URL("")` wywracał budowanie komunikatem „Invalid URL".
  */
  metadataBase: new URL(env.APP_URL ?? env.AUTH_URL ?? "http://localhost:3000"),
  /*
    Ikona i tryb po dodaniu do ekranu głównego iPhone'a.

    Bez tego iOS rysuje szarą kafelkę z pierwszą literą tytułu, bo nie ma czego
    pokazać. Sam plik `apple-icon.png` (180×180) leży w `src/app/` — Next
    znajduje go po nazwie i sam wystawia `<link rel="apple-touch-icon">`.

    `capable` uruchamia aplikację bez paska Safari. Nawigacja jest w panelu
    (dolny pasek na telefonie), więc pasek przeglądarki tylko zabierałby
    wysokość ekranu.
  */
  appleWebApp: {
    title: "Rentix",
    capable: true,
    statusBarStyle: "default",
  },
};

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

  return (
    <html lang="pl" data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Musi wykonać się przed pierwszym malowaniem — stąd inline zamiast <Script>. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${bricolage.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}

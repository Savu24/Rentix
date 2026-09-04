import { BarChart3, FileText, Wallet, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/auth/routes";
import { formatPLN } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rentix · zarządzanie najmem bez Excela",
  description:
    "Umowy, rachunki, płatności i raporty finansowe w jednym miejscu. Bez korporacyjnego interfejsu i bez cen rosnących z każdym mieszkaniem.",
};

/**
 * Strona główna według „Rentix Design System.dc.html".
 *
 * Odstępstwa od makiety są celowe i wszystkie idą w jedną stronę — makieta
 * powstała przed decyzjami produktowymi i obiecuje rzeczy, których Rentix nie
 * robi. Nie zapowiadamy podpisu elektronicznego ani zgłoszeń usterek (moduł
 * świadomie poza zakresem), a sekcja z opiniami klientów czeka na prawdziwe
 * cytaty — wymyślone byłyby zwykłym oszustwem wobec odwiedzającego.
 */

const HERO_BARS = [40, 55, 48, 70, 62, 85];

const FEATURES = [
  {
    icon: FileText,
    title: "Umowy najmu",
    description:
      "Kreator umowy z danymi z kartoteki i gotowym PDF-em do podpisu, z polskimi znakami i kwotą słownie.",
    background: "bg-mint",
  },
  {
    icon: Wallet,
    title: "Czynsz i płatności",
    description:
      "Rachunki naliczają się same w dniu z umowy. Statusy opłacone i zaległe, przypomnienia mailem do najemcy.",
    background: "bg-sand",
  },
  {
    icon: Wrench,
    title: "Koszty najmu",
    description:
      "Rata kredytu, wspólnota, remonty i ubezpieczenie w jednym rejestrze, z podziałem na nieruchomości.",
    background: "bg-clay",
  },
  {
    icon: BarChart3,
    title: "Raporty finansowe",
    description:
      "Przychód, koszty i wynik wg nieruchomości. Zestawienie roczne kasowo i eksport CSV dla księgowego.",
    background: "bg-mint",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="px-4 pt-4 sm:px-8 sm:pt-5">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[16px] border border-border bg-surface px-4 py-3 sm:px-[18px]">
          <Logo />

          <div className="hidden items-center gap-[26px] md:flex">
            <a href="#funkcje" className="r-navlink">
              Funkcje
            </a>
            <a href="#cennik" className="r-navlink">
              Cennik
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href={ROUTES.login}>Zaloguj się</Link>
            </Button>
          </div>
        </nav>
      </div>

      <main>
        <section className="mx-auto max-w-[760px] px-5 pt-11 text-center sm:px-8 sm:pt-16">
          <p className="mb-6 inline-flex items-center rounded-full bg-highlight px-3.5 py-1.5 font-mono text-[12.5px] font-medium uppercase tracking-[0.04em] text-highlight-text">
            Zarządzanie najmem, po ludzku
          </p>

          <h1 className="r-display text-[36px] leading-[1.05] text-fg text-pretty sm:text-[58px]">
            Zarządzaj <span className="r-mark">najmem</span>
            <br />
            bez Excela i przepłacania
          </h1>

          <p className="mx-auto mt-5 max-w-[520px] text-[17.5px] leading-[1.55] text-muted">
            Umowy, rachunki, płatności i raporty finansowe w jednym, prostym miejscu. Bez
            korporacyjnego interfejsu i bez cen rosnących z każdym mieszkaniem.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-sm">
              <Link href={ROUTES.register}>Załóż darmowe konto →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#cennik">Zobacz cennik</a>
            </Button>
          </div>

          <p className="mt-3.5 text-[13px] text-muted">
            Bez karty kredytowej · Konfiguracja w 10 minut
          </p>
        </section>

        <section className="px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-10">
          <Card className="mx-auto max-w-[640px] shadow-md">
            <CardContent className="p-[22px]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">Przegląd miesiąca</p>
                <p className="font-mono text-xs text-muted">SIE 2026</p>
              </div>

              {/* Kwota z groszami nie mieści się w połowie szerokości karty na
                  telefonie — poniżej sm kafelki idą jeden pod drugim, zamiast
                  wypychać liczbę poza kartę. */}
              <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[10px] bg-mint p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">Przychód</p>
                  <p className="font-mono text-[20px] font-medium tabular text-fg sm:text-[22px]">
                    {formatPLN(1_840_000)}
                  </p>
                </div>
                <div className="rounded-[10px] bg-sand p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">Obłożenie</p>
                  <p className="font-mono text-[20px] font-medium tabular text-fg sm:text-[22px]">
                    92%
                  </p>
                </div>
              </div>

              <div className="flex h-20 items-end gap-2 px-0.5" aria-hidden>
                {HERO_BARS.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-accent"
                    style={{ height: `${height}%`, opacity: 0.5 + index * 0.09 }}
                  />
                ))}
              </div>

              {/* Liczby na podglądzie są przykładowe — mówimy to wprost, żeby
                  karta nie wyglądała na zrzut z czyjegoś konta. */}
              <p className="mt-3 text-center text-[11px] text-muted">
                Podgląd panelu na danych przykładowych
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="funkcje" className="px-5 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="r-display text-center text-[32px] text-fg">Wszystko w jednym miejscu</h2>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-[15.5px] text-muted">
              Cztery filary codziennej pracy właściciela. Bez przełączania się między
              narzędziami.
            </p>

            <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className={`rounded-card p-[22px] ${feature.background}`}
                  >
                    <span className="mb-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-white/50 text-fg">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <p className="mb-1.5 text-base font-semibold text-fg">{feature.title}</p>
                    <p className="text-sm leading-[1.55] text-fg/[0.72]">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="cennik" className="px-5 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="r-display text-center text-[32px] text-fg">
              Prosty cennik, bez pułapek
            </h2>

            <div className="mx-auto mt-7 grid max-w-[760px] gap-[18px] sm:grid-cols-2">
              <Card>
                <CardContent className="p-[26px]">
                  <p className="text-[15px] font-semibold text-fg">Free</p>
                  <p className="r-display mt-1 text-[30px] text-fg">0 zł</p>
                  <p className="mt-1 text-[13.5px] text-muted">do 20 najemców</p>

                  <ul className="mt-5 space-y-2 text-sm text-muted">
                    <PlanItem>Umowy i dokumenty</PlanItem>
                    <PlanItem>Rachunki i przypomnienia</PlanItem>
                    <PlanItem>Koszty i zestawienie roczne</PlanItem>
                  </ul>

                  <Button asChild variant="secondary" block className="mt-5">
                    <Link href={ROUTES.register}>Zacznij za darmo</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative border-transparent bg-mint">
                <span className="absolute -top-[11px] right-5 rounded-full bg-accent2 px-2.5 py-1 font-mono text-[11px] font-medium text-white">
                  BEZ LIMITÓW
                </span>

                <CardContent className="p-[26px]">
                  <p className="text-[15px] font-semibold text-fg">Pro</p>
                  <p className="r-display mt-1 text-[30px] text-fg">
                    149 zł
                    <span className="font-sans text-[15px] font-medium text-fg/60">/mies.</span>
                  </p>
                  <p className="mt-1 text-[13.5px] text-fg/70">
                    bez limitu nieruchomości i najemców
                  </p>

                  <ul className="mt-5 space-y-2 text-sm text-fg/80">
                    <PlanItem>Wszystko z Free</PlanItem>
                    <PlanItem>Raporty i eksport księgowy</PlanItem>
                    <PlanItem>Wielu użytkowników zespołu</PlanItem>
                  </ul>

                  <Button asChild block className="mt-5">
                    <Link href={ROUTES.register}>Przejdź na Pro</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-12 sm:pb-24">
          <div className="mx-auto max-w-6xl rounded-[20px] bg-accent px-8 py-12 text-center">
            <h2 className="r-display text-[28px] leading-tight text-accent-contrast">
              Przenieś swój najem
              <br />z Excela do Rentiksa
            </h2>
            <p className="mt-2.5 text-[15px] text-accent-contrast/75">
              Pierwsze 20 najemców za darmo, na zawsze.
            </p>
            <Button asChild size="lg" variant="highlight" className="mt-5">
              <Link href={ROUTES.register}>Załóż darmowe konto →</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-[13px] text-muted">© 2026 Rentix. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
}

/** Pozycja listy w cenniku. Znak „✓" jest dekoracją, więc nie czyta go czytnik. */
function PlanItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="text-accent">
        ✓
      </span>
      {children}
    </li>
  );
}

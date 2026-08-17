import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/auth/routes";
import { formatPLN } from "@/lib/utils";

/**
 * Hero strony głównej. Pełna część marketingowa (funkcje, porównanie z SON,
 * cennik, opinie, publiczne oferty) powstaje w etapie 10 — tutaj jest tyle,
 * ile potrzeba, żeby wejść do rejestracji i zobaczyć design system w obu motywach.
 */

const HERO_BARS = [40, 55, 48, 70, 62, 85];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="px-4 pt-4 sm:px-8 sm:pt-5">
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-[16px] border border-border bg-surface px-4 py-3 sm:px-[18px]">
          <Logo />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href={ROUTES.login}>Zaloguj się</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.register}>Załóż konto</Link>
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
            Umowy, płatności, zgłoszenia usterek i raporty finansowe w jednym, prostym
            miejscu — bez korporacyjnego interfejsu i bez cen rosnących z każdym mieszkaniem.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-sm">
              <Link href={ROUTES.register}>Załóż darmowe konto →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={ROUTES.login}>Mam już konto</Link>
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

              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-[10px] bg-mint p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">Przychód</p>
                  <p className="font-mono text-[22px] font-medium tabular text-fg">
                    {formatPLN(1_840_000)}
                  </p>
                </div>
                <div className="rounded-[10px] bg-sand p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">Obłożenie</p>
                  <p className="font-mono text-[22px] font-medium tabular text-fg">92%</p>
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
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-[13px] text-muted">© 2026 Rentix. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
}

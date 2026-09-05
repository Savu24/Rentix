import { BarChart3, FileText, Wallet, Wrench } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

/**
 * Strona główna według „Rentix Design System.dc.html", w wersji krajowej
 * wskazanej propsem.
 *
 * Układ jest wspólny, treść nie. Wersja brytyjska to osobny tekst pisany pod
 * inny rynek, a nie tłumaczenie polskiego — różnice i ich powody opisuje
 * komentarz w `@/lib/i18n/dictionaries/uk`. Wspólny jest tylko szkielet, żeby
 * poprawka układu nie wymagała nanoszenia jej dwa razy.
 *
 * Odstępstwa od makiety są celowe i wszystkie idą w jedną stronę — makieta
 * powstała przed decyzjami produktowymi i obiecuje rzeczy, których Rentix nie
 * robi. Nie zapowiadamy podpisu elektronicznego ani zgłoszeń usterek (moduł
 * świadomie poza zakresem), a sekcja z opiniami klientów czeka na prawdziwe
 * cytaty — wymyślone byłyby zwykłym oszustwem wobec odwiedzającego.
 */

const HERO_BARS = [40, 55, 48, 70, 62, 85];

/** Ikona i tło karty idą po `id` z tablicy funkcji, bo obrazek nie jest tekstem. */
const FEATURE_STYLE: Record<string, { icon: typeof FileText; background: string }> = {
  leases: { icon: FileText, background: "bg-mint" },
  payments: { icon: Wallet, background: "bg-sand" },
  costs: { icon: Wrench, background: "bg-clay" },
  reports: { icon: BarChart3, background: "bg-mint" },
};

/** Przykładowy przychód na podglądzie panelu: 18 400 zł albo £18,400. */
const PREVIEW_INCOME = 1_840_000;

export function Landing({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).marketing;
  const routes = publicRoutes(locale);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="px-4 pt-4 sm:px-8 sm:pt-5">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[16px] border border-border bg-surface px-4 py-3 sm:px-[18px]">
          <Logo />

          <div className="hidden items-center gap-[26px] md:flex">
            <a href={`#${t.nav.featuresAnchor}`} className="r-navlink">
              {t.nav.features}
            </a>
            <a href={`#${t.nav.pricingAnchor}`} className="r-navlink">
              {t.nav.pricing}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href={routes.login}>{t.nav.login}</Link>
            </Button>
          </div>
        </nav>
      </div>

      <main>
        <section className="mx-auto max-w-[760px] px-5 pt-11 text-center sm:px-8 sm:pt-16">
          <p className="mb-6 inline-flex items-center rounded-full bg-highlight px-3.5 py-1.5 font-mono text-[12.5px] font-medium uppercase tracking-[0.04em] text-highlight-text">
            {t.hero.badge}
          </p>

          <h1 className="r-display text-[36px] leading-[1.05] text-fg text-pretty sm:text-[58px]">
            {t.hero.titleLead}
            <span className="r-mark">{t.hero.titleMark}</span>
            <br />
            {t.hero.titleTail}
          </h1>

          <p className="mx-auto mt-5 max-w-[520px] text-[17.5px] leading-[1.55] text-muted">
            {t.hero.lead}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-sm">
              <Link href={routes.register}>{t.hero.primaryCta}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href={`#${t.nav.pricingAnchor}`}>{t.hero.secondaryCta}</a>
            </Button>
          </div>

          <p className="mt-3.5 text-[13px] text-muted">{t.hero.note}</p>
        </section>

        <section className="px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-10">
          <Card className="mx-auto max-w-[640px] shadow-md">
            <CardContent className="p-[22px]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">{t.preview.title}</p>
                <p className="font-mono text-xs text-muted">{t.preview.period}</p>
              </div>

              {/* Kwota z groszami nie mieści się w połowie szerokości karty na
                  telefonie — poniżej sm kafelki idą jeden pod drugim, zamiast
                  wypychać liczbę poza kartę. */}
              <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[10px] bg-mint p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">{t.preview.income}</p>
                  <p className="font-mono text-[20px] font-medium tabular text-fg sm:text-[22px]">
                    {formatMoney(PREVIEW_INCOME, locale)}
                  </p>
                </div>
                <div className="rounded-[10px] bg-sand p-3.5">
                  <p className="mb-1.5 text-xs text-fg/65">{t.preview.occupancy}</p>
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
              <p className="mt-3 text-center text-[11px] text-muted">{t.preview.disclaimer}</p>
            </CardContent>
          </Card>
        </section>

        <section id={t.nav.featuresAnchor} className="px-5 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="r-display text-center text-[32px] text-fg">{t.features.heading}</h2>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-[15.5px] text-muted">
              {t.features.lead}
            </p>

            <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {t.features.items.map((feature) => {
                const style = FEATURE_STYLE[feature.id];
                const Icon = style.icon;

                return (
                  <div key={feature.id} className={`rounded-card p-[22px] ${style.background}`}>
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

        <section id={t.nav.pricingAnchor} className="px-5 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="r-display text-center text-[32px] text-fg">{t.pricing.heading}</h2>

            {/* Cztery progi w rzędzie dopiero od lg — poniżej idą po dwa, bo
                cena i przypis nie mieszczą się w ćwiartce szerokości tabletu. */}
            <div className="mx-auto mt-7 grid max-w-[1100px] gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {t.pricing.plans.map((plan) => (
                <Card
                  key={plan.name}
                  /* `flex` na karcie, nie tylko w środku: bez definitywnej
                     wysokości `h-full` na treści nie miałoby się do czego
                     odnieść i przyciski rozjechałyby się w pionie. */
                  className={`relative flex flex-col ${
                    plan.featured ? "border-transparent bg-mint" : ""
                  }`}
                >
                  {plan.featured ? (
                    <span className="absolute -top-[11px] right-5 rounded-full bg-accent2 px-2.5 py-1 font-mono text-[11px] font-medium text-white">
                      {t.pricing.badge}
                    </span>
                  ) : null}

                  <CardContent className="flex flex-1 flex-col p-[26px]">
                    <p className="text-[15px] font-semibold text-fg">{plan.name}</p>
                    <p className="r-display mt-1 text-[30px] text-fg">
                      {plan.price}
                      <span className="font-sans text-[15px] font-medium text-fg/60">
                        {plan.period}
                      </span>
                    </p>
                    <p className={`mt-1 text-[13.5px] ${plan.featured ? "text-fg/70" : "text-muted"}`}>
                      {plan.note}
                    </p>

                    {/* `flex-1` na liście wyrównuje przyciski w rzędzie mimo
                        różnej liczby pozycji na kartach. */}
                    <ul
                      className={`mt-5 flex-1 space-y-2 text-sm ${
                        plan.featured ? "text-fg/80" : "text-muted"
                      }`}
                    >
                      {plan.items.map((item) => (
                        <PlanItem key={item}>{item}</PlanItem>
                      ))}
                    </ul>

                    <Button
                      asChild
                      block
                      variant={plan.featured ? "primary" : "secondary"}
                      className="mt-5"
                    >
                      <Link href={routes.register}>{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mx-auto mt-5 max-w-[560px] text-center text-[13px] text-muted">
              {t.pricing.note}
            </p>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-12 sm:pb-24">
          <div className="mx-auto max-w-6xl rounded-[20px] bg-accent px-8 py-12 text-center">
            <h2 className="r-display text-[28px] leading-tight text-accent-contrast">
              {t.closing.titleFirstLine}
              <br />
              {t.closing.titleSecondLine}
            </h2>
            <p className="mt-2.5 text-[15px] text-accent-contrast/75">{t.closing.lead}</p>
            <Button asChild size="lg" variant="highlight" className="mt-5">
              <Link href={routes.register}>{t.closing.cta}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-[13px] text-muted">{t.footer.rights}</p>
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

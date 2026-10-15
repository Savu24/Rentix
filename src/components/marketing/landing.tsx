import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  FileText,
  Home,
  LayoutGrid,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Logo, LogoMark } from "@/components/brand/logo";
import { PlanCalculator } from "@/components/marketing/plan-calculator";
import { InvoiceStatusBadge } from "@/components/panel/status-badges";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Strona główna (redesign/23-landing-*.svg), w wersji krajowej wskazanej
 * propsem.
 *
 * Układ jest wspólny, treść nie. Wersja brytyjska to osobny tekst pisany pod
 * inny rynek, a nie tłumaczenie polskiego — różnice i ich powody opisuje
 * komentarz w `@/lib/i18n/dictionaries/uk`. Wspólny jest tylko szkielet, żeby
 * poprawka układu nie wymagała nanoszenia jej dwa razy.
 *
 * Nie zapowiadamy podpisu elektronicznego ani zgłoszeń usterek (moduł
 * świadomie poza zakresem), a sekcja z opiniami klientów czeka na prawdziwe
 * cytaty — wymyślone byłyby zwykłym oszustwem wobec odwiedzającego.
 */

/** Ikona karty funkcji idzie po `id` z tablicy funkcji, bo obrazek nie jest tekstem. */
const FEATURE_ICON: Record<string, typeof FileText> = {
  leases: FileText,
  payments: Receipt,
  costs: Wallet,
  reports: BarChart3,
};

/** Ikony atrapy paska bocznego w podglądzie panelu. */
const PREVIEW_NAV = [LayoutGrid, Building2, Users, FileText, Wallet, BarChart3];

/** Przykładowe dokumenty na podglądzie: numer, kwota w groszach, status. */
const PREVIEW_ROWS = [
  { number: "4/08", grosze: 210_000, status: "PAID" as const, inDays: 0 },
  { number: "5/08", grosze: 145_000, status: "DUE_SOON" as const, inDays: 3 },
  { number: "6/08", grosze: 198_000, status: "UPCOMING" as const, inDays: 12 },
];

export function Landing({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const t = d.marketing;
  const routes = publicRoutes(locale);
  const now = new Date();
  const notes = t.hero.note.split(" · ");

  return (
    <div className="min-h-dvh bg-bg">
      <header className="px-5 pt-5 sm:px-8">
        <nav className="mx-auto flex max-w-[1096px] items-center justify-between gap-4">
          <Link href={routes.home} className="rounded-btn" aria-label={d.common.homeAriaLabel}>
            <Logo />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <a href={`#${t.nav.featuresAnchor}`} className="hidden rounded-btn px-3 py-2 text-sm font-[550] text-fg hover:bg-hover md:block">
              {t.nav.features}
            </a>
            <a href={`#${t.nav.pricingAnchor}`} className="hidden rounded-btn px-3 py-2 text-sm font-[550] text-fg hover:bg-hover md:block">
              {t.nav.pricing}
            </a>
            <Link href={routes.login} className="rounded-btn px-3 py-2 text-sm font-[550] text-fg hover:bg-hover">
              {t.nav.login}
            </Link>
            <ThemeToggle />
            <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
              <Link href={routes.register}>{t.hero.primaryCta}</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1096px] grid-cols-1 items-center gap-12 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:pt-16 lg:pb-24">
          <div className="flex flex-col items-start">
            <Badge tone="accent" icon={Home}>
              {t.hero.badge}
            </Badge>

            <h1 className="r-display mt-5 text-[42px] leading-[1.08] tracking-[-1.2px] text-fg sm:text-[56px] lg:text-[60px]">
              {t.hero.titleLead}
              {t.hero.titleMark}
              <br />
              {/* Bursztynowa kreska pod drugą linią — znak marki z projektu. */}
              <span className="bg-[linear-gradient(var(--amber),var(--amber))] bg-[length:100%_0.16em] bg-bottom bg-no-repeat pb-1">
                {t.hero.titleTail}
              </span>
            </h1>

            <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6] text-muted">{t.hero.lead}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={routes.register}>
                  {t.hero.primaryCta}
                  <ArrowRight className="size-[18px]" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href={`#${t.nav.pricingAnchor}`}>{t.hero.secondaryCta}</a>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-[13.5px] text-muted">
              {notes.map((note) => (
                <li key={note} className="flex items-center gap-2">
                  <Check className="size-4 text-good" strokeWidth={2.2} aria-hidden />
                  {note}
                </li>
              ))}
            </ul>
          </div>

          {/* Podgląd panelu: atrapa z danymi przykładowymi — plakietka mówi to
              wprost, żeby karta nie wyglądała na zrzut z czyjegoś konta. */}
          <div className="flex overflow-hidden rounded-tile bg-surface shadow-float" aria-hidden>
            <div className="hidden w-[120px] shrink-0 flex-col gap-4 bg-gradient-to-b from-side to-side-end px-4 py-5 sm:flex">
              <LogoMark className="size-6" />
              <div className="flex flex-col gap-1.5">
                {PREVIEW_NAV.map((Icon, index) => (
                  <span
                    key={index}
                    className={cn("flex h-8 items-center gap-2.5 rounded-control px-2", index === 0 && "bg-side-active")}
                  >
                    <Icon className={cn("size-3.5 shrink-0", index === 0 ? "text-highlight" : "text-side-ink-2")} />
                    <span className={cn("h-1 flex-1 rounded-full", index === 0 ? "bg-side-active-ink" : "bg-side-line")} />
                  </span>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-fg">{t.preview.title}</p>
                <Badge size="sm">{t.preview.disclaimer}</Badge>
              </div>

              <div className="grid grid-cols-2 rounded-card bg-hover p-4">
                <div className="flex min-w-0 flex-col gap-1.5 pr-3">
                  <span className="text-[12.5px] text-muted">{t.preview.arrears}</span>
                  <span className="font-mono text-[22px] font-[650] whitespace-nowrap text-good">{formatMoney(0, locale)}</span>
                  <Badge tone="good" size="sm" icon={Check} className="w-fit">
                    {t.preview.settled}
                  </Badge>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 border-l border-border pl-4">
                  <span className="text-[12.5px] text-muted">{t.preview.occupancy}</span>
                  <span className="font-mono text-[22px] font-[650] text-fg">92%</span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <span className="block h-full w-[92%] rounded-full bg-accent" />
                  </span>
                </div>
              </div>

              <ul className="flex flex-col">
                {PREVIEW_ROWS.map((row) => (
                  <li
                    key={row.number}
                    className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-fg">
                      {d.panel.invoices.kind.BILL} {row.number}
                    </span>
                    <InvoiceStatusBadge
                      status={row.status}
                      d={d}
                      size="sm"
                      due={{ date: new Date(now.getTime() + row.inDays * 86_400_000), now, locale }}
                    />
                    <span className="shrink-0 font-mono text-[13.5px] font-semibold whitespace-nowrap text-fg">
                      {formatMoney(row.grosze, locale)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="flex items-center gap-2.5 rounded-alert bg-accent-soft px-3.5 py-3 text-[13px] font-[550] text-accent">
                <Receipt className="size-4 shrink-0" aria-hidden />
                {t.preview.generated}
              </p>
            </div>
          </div>
        </section>

        <section id={t.nav.featuresAnchor} className="scroll-mt-8 px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-[1096px]">
            <h2 className="r-display text-[30px] leading-9 tracking-[-0.6px] text-fg sm:text-[34px]">
              {t.features.heading}
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {t.features.items.map((feature) => {
                const Icon = FEATURE_ICON[feature.id] ?? FileText;
                return (
                  <div key={feature.id} className="flex gap-5 rounded-tile border border-border bg-surface p-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-alert bg-accent-soft text-accent">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <h3 className="text-base font-semibold text-fg">{feature.title}</h3>
                      <p className="text-sm leading-[1.6] text-muted">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id={t.nav.pricingAnchor} className="scroll-mt-8 px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-[1096px]">
            <h2 className="r-display text-[30px] leading-9 tracking-[-0.6px] text-fg sm:text-[34px]">
              {t.pricing.heading}
            </h2>
            <p className="mt-2 text-[15px] text-muted">{t.pricing.lead}</p>

            {/* Cztery progi w rzędzie dopiero od lg — poniżej idą po dwa, bo
                cena i przypis nie mieszczą się w ćwiartce szerokości tabletu. */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {t.pricing.plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex flex-col rounded-tile p-6",
                    plan.featured
                      ? "bg-gradient-to-b from-side to-side-end text-side-ink"
                      : "border border-border bg-surface",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-base font-semibold", plan.featured ? "text-side-active-ink" : "text-fg")}>
                      {plan.name}
                    </p>
                    {plan.featured ? (
                      <Badge tone="amber" size="sm">
                        {t.pricing.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "r-display mt-4 text-[34px] leading-10 tracking-[-0.8px]",
                      plan.featured ? "text-side-active-ink" : "text-fg",
                    )}
                  >
                    {plan.price}
                    <span className={cn("font-sans text-[14px] font-medium tracking-normal", plan.featured ? "text-side-ink-2" : "text-muted")}>
                      {plan.period}
                    </span>
                  </p>
                  <p className={cn("mt-1 text-[13.5px] font-semibold", plan.featured ? "text-highlight" : "text-fg")}>
                    {plan.note}
                  </p>

                  {/* `flex-1` na liście wyrównuje przyciski w rzędzie mimo
                      różnej liczby pozycji na kartach. */}
                  <ul className="mt-6 flex-1 space-y-2.5 text-[13.5px]">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check
                          className={cn("mt-0.5 size-4 shrink-0", plan.featured ? "text-highlight" : "text-good")}
                          strokeWidth={2.2}
                          aria-hidden
                        />
                        <span className={plan.featured ? "text-side-ink" : "text-fg"}>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild block variant={plan.featured ? "highlight" : "secondary"} className="mt-6">
                    <Link href={routes.register}>{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>

            <PlanCalculator locale={locale} t={t.pricing.calculator} plans={t.pricing.plans} />
          </div>
        </section>

        <section className="px-5 pt-8 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto flex max-w-[1096px] flex-col items-start gap-8 rounded-[20px] bg-gradient-to-b from-side to-side-end px-8 py-12 sm:px-14 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <h2 className="r-display text-[30px] leading-[1.15] tracking-[-0.8px] text-side-active-ink sm:text-[38px]">
                {t.closing.titleFirstLine}
                <br />
                <span className="text-highlight">{t.closing.titleSecondLine}</span>
              </h2>
              <p className="text-[15px] text-side-ink">{t.closing.lead}</p>
            </div>
            <Button asChild size="lg" variant="highlight" className="shrink-0">
              <Link href={routes.register}>
                {t.closing.cta}
                <ArrowRight className="size-[18px]" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="px-5 sm:px-8">
        <div className="mx-auto flex max-w-[1096px] flex-wrap items-center justify-between gap-4 border-t border-border py-8">
          <Logo size="sm" />
          <p className="text-[13px] text-muted">{t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}

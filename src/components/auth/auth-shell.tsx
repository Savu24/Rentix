import { BarChart3, FileText, Receipt } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";

const FEATURE_ICONS = [FileText, Receipt, BarChart3];

/**
 * Rama stron logowania, rejestracji i zaproszeń (redesign/22-*.svg):
 * na desktopie panel marki w butelkowej zieleni po lewej, formularz po
 * prawej; na telefonie samo logo nad formularzem.
 *
 * Świadomie komponent, a nie `layout.tsx`: strony auth siedzą w dwóch drzewach
 * krajowych (`/pl/logowanie`, `/uk/login`), a layout musiałby wtedy istnieć
 * osobno w każdym z nich tylko po to, żeby podać jeden props.
 *
 * Przełącznika kraju tutaj nie ma. Prowadziłby na stronę główną drugiej wersji,
 * czyli wyrzucałby z rozpoczętego logowania — a kto tu trafił, ten wybór kraju
 * ma już za sobą.
 */
export function AuthShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const d = getDictionary(locale);
  const brand = d.auth.brand;
  const home = publicRoutes(locale).home;

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="relative hidden w-[min(640px,44vw)] shrink-0 flex-col justify-between bg-gradient-to-b from-side to-side-end px-14 py-12 lg:flex">
        <Link href={home} className="w-fit rounded-btn" aria-label={d.common.homeAriaLabel}>
          <Logo onDark />
        </Link>

        <div className="flex flex-col gap-12">
          <p className="r-display text-[56px] leading-[1.05] tracking-[-1.4px] text-side-active-ink xl:text-[64px]">
            {brand.lineOne}
            <br />
            <span className="text-highlight">{brand.lineTwo}</span>
          </p>
          <ul className="flex flex-col gap-3">
            {brand.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? FileText;
              return (
                <li key={feature} className="flex items-center gap-4 text-[15px] text-side-ink">
                  <span className="flex size-8 items-center justify-center rounded-[9px] bg-side-active" aria-hidden>
                    <Icon className="size-[18px] text-highlight" strokeWidth={1.7} />
                  </span>
                  {feature}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-[13px] text-side-ink-2">
          {fill(brand.copyright, { year: new Date().getFullYear() })}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <Link href={home} className="rounded-btn lg:hidden" aria-label={d.common.homeAriaLabel}>
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pt-2 pb-16 sm:items-center sm:pt-0">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

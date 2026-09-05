import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";

/**
 * Rama stron logowania i rejestracji.
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

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href={publicRoutes(locale).home}
          className="rounded-btn"
          aria-label={d.common.homeAriaLabel}
        >
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

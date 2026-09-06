import { Bell, LogOut, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { OrganizationSwitcher } from "@/components/panel/organization-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOutAction } from "@/app/(app)/actions";
import { getDictionary, type Locale } from "@/lib/i18n";

export function Topbar({
  initials,
  locale,
  organizations,
  activeOrganizationId,
  isAdmin,
}: {
  initials: string;
  locale: Locale;
  /** Organizacje konta — przełącznik pojawia się dopiero od dwóch. */
  organizations: { id: string; name: string }[];
  activeOrganizationId: string;
  /**
   * Czy pokazać wejście do panelu administratora platformy.
   *
   * Rola bierze się z tokenu sesji, więc bywa o odświeżenie spóźniona — i to
   * wystarcza, bo decyduje wyłącznie o widoczności odnośnika. Kto na niego
   * kliknie bez uprawnień, dostanie 404 z `requireAdminSession`.
   */
  isAdmin?: boolean;
}) {
  const t = getDictionary(locale).panel.shell;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
      {/* Na desktopie logo siedzi w sidebarze, więc tu pojawia się tylko na małych ekranach. */}
      <div className="lg:hidden">
        <Logo size="sm" />
      </div>

      {/* Przełącznik stoi po lewej, przy logo: mówi, czyje dane widać niżej,
          więc należy do tej samej okolicy co nazwa aplikacji, a nie do
          przycisków konta po prawej. */}
      <OrganizationSwitcher organizations={organizations} activeId={activeOrganizationId} />

      <div className="ml-auto flex items-center gap-2">
        {isAdmin ? (
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Administracja</span>
            </Link>
          </Button>
        ) : null}

        <ThemeToggle />

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-muted transition-colors hover:bg-surface-alt hover:text-fg"
          aria-label={t.notifications}
        >
          <Bell className="h-4 w-4" aria-hidden />
        </button>

        <span
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-accent2-soft text-[12.5px] font-semibold text-accent2 lg:flex"
          aria-hidden
        >
          {initials}
        </span>

        <form action={signOutAction}>
          <Button type="submit" variant="secondary" size="sm">
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t.signOut}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}

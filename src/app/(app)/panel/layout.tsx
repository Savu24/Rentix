import { MobileNav } from "@/components/panel/mobile-nav";
import { PanelLocaleSync } from "@/components/panel/panel-locale";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { requireOwnerSession } from "@/lib/auth/session";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { organizationLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";

/**
 * Szkielet panelu właściciela.
 *
 * Sesja jest sprawdzana tutaj, więc każda podstrona panelu ma ją zagwarantowaną.
 * To nie zwalnia API routes z własnej autoryzacji — layout chroni widok,
 * a nie dane.
 *
 * Język bierze się z ustawienia organizacji, nie z adresu: panel nie ma
 * prefiksu kraju, bo trzymanie kilkudziesięciu stron w dwóch drzewach tras
 * kosztowałoby więcej niż daje. Zagnieżdżony `I18nProvider` przykrywa ten
 * z korzenia aplikacji, który zna tylko preferencję odwiedzającego.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwnerSession("/panel");

  const [subscription, locale] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: session.user.organizationId },
      select: { plan: true },
    }),
    organizationLocale(session.user.organizationId),
  ]);

  const dictionary = getDictionary(locale);
  const planLabel =
    subscription?.plan === "PRO" ? dictionary.panel.shell.planPro : dictionary.panel.shell.planFree;

  const userInitials = initials(session.user.name);
  const userName = session.user.name ?? dictionary.panel.shell.fallbackAccountName;

  return (
    <I18nProvider locale={locale} dictionary={clientDictionary(locale)}>
      <PanelLocaleSync locale={locale} />

      <div className="flex min-h-dvh bg-bg">
        <Sidebar userName={userName} planLabel={planLabel} initials={userInitials} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar initials={userInitials} locale={locale} />

          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>

          <MobileNav />
        </div>
      </div>
    </I18nProvider>
  );
}

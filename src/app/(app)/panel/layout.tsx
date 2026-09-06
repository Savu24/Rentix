import { AccessRevoked } from "@/components/panel/access-revoked";
import { MobileNav } from "@/components/panel/mobile-nav";
import { PanelLocaleSync } from "@/components/panel/panel-locale";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { membershipRole, requireOwnerSession, userOrganizations } from "@/lib/auth/session";
import { PlanFeaturesProvider } from "@/lib/billing/client";
import { organizationFeatures, organizationPlan } from "@/lib/billing/server";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { organizationLocale } from "@/lib/i18n/server";
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

  /*
    Odkąd w organizacji bywa więcej niż jedna osoba, samo posiadanie ważnego
    tokenu przestało wystarczać: po usunięciu z zespołu sesja zostaje ważna,
    ale członkostwa już nie ma. Endpointy sprawdzają to same
    (`requireApiOwner`), a tutaj chodzi o widok — inaczej usunięty
    współpracownik oglądałby cudze dane do wygaśnięcia tokenu.
  */
  if (!(await membershipRole(session.user.id, session.user.organizationId))) {
    return <AccessRevoked />;
  }

  const [plan, locale, features, organizations] = await Promise.all([
    organizationPlan(session.user.organizationId),
    organizationLocale(session.user.organizationId),
    organizationFeatures(session.user.organizationId),
    userOrganizations(session.user.id),
  ]);

  const dictionary = getDictionary(locale);
  const planLabel = dictionary.panel.shell.plans[plan.plan];

  const userInitials = initials(session.user.name);
  const userName = session.user.name ?? dictionary.panel.shell.fallbackAccountName;

  return (
    <I18nProvider locale={locale} dictionary={clientDictionary(locale)}>
      {/*
        Zestaw funkcji planu wchodzi tu raz, tak samo jak słownik: kłódkę
        rysuje ten komponent, który zna przycisk, a wszystkie siedzą po stronie
        przeglądarki i żaden nie może zapytać bazy.
      */}
      <PlanFeaturesProvider features={features}>
        <PanelLocaleSync locale={locale} />

        <div className="flex min-h-dvh bg-bg">
          <Sidebar userName={userName} planLabel={planLabel} initials={userInitials} />

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              initials={userInitials}
              locale={locale}
              organizations={organizations}
              activeOrganizationId={session.user.organizationId}
            />

            <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>

            <MobileNav />
          </div>
        </div>
      </PlanFeaturesProvider>
    </I18nProvider>
  );
}

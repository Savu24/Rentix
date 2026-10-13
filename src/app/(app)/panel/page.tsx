import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  DashboardPanel,
  ExpiringList,
  KeyFigures,
  OverdueList,
  PaymentsTile,
  PropertyList,
  UpcomingList,
} from "@/components/panel/dashboard/sections";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { dashboardOverview } from "@/lib/dashboard/service";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { getOrganization, isSellerComplete } from "@/lib/organizations/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.dashboard.title };
}

export default async function OwnerDashboardPage() {
  const session = await requireOwnerSession("/panel");
  const organizationId = session.user.organizationId;

  const [locale, dictionary, overview, organization] = await Promise.all([
    panelLocale(),
    panelDictionary(),
    dashboardOverview(organizationId),
    getOrganization(organizationId),
  ]);
  const t = dictionary.panel.dashboard;

  const firstName = session.user.name?.split(" ")[0] ?? t.greetingFallback;
  const empty = overview.properties.count === 0;

  // Przypomnienie znika samo, gdy adres wystawcy zostanie uzupełniony — to nie
  // jest komunikat do odklikania, tylko brak, który widać dopiero na wysłanym
  // dokumencie. Pulpit jest jedynym ekranem, na który zagląda się codziennie.
  const sellerIncomplete = organization !== null && !isSellerComplete(organization);

  const addProperty = (
    <Link href="/panel/nieruchomosci/nowa">
      <Plus className="size-[18px]" aria-hidden />
      {t.addProperty}
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="r-display text-[30px] leading-9 text-fg">
            {fill(t.greeting, { name: firstName })}
          </h1>
          <p className="text-sm text-muted">{formatDateIn(new Date(), locale, "weekdayLong")}</p>
        </div>

        {empty ? null : (
          <>
            {/* Telefon: jedna okrągła akcja obok tytułu, jak w projekcie. */}
            <Button asChild size="icon" className="mt-1 size-11 shrink-0 rounded-full lg:hidden">
              <Link href="/panel/nieruchomosci/nowa" aria-label={t.addProperty}>
                <Plus className="size-[22px]" strokeWidth={2} aria-hidden />
              </Link>
            </Button>
            <Button asChild className="mt-1 hidden shrink-0 lg:inline-flex">
              {addProperty}
            </Button>
          </>
        )}
      </header>

      {sellerIncomplete ? (
        <Alert
          tone="warning"
          action={
            <Link href="/panel/ustawienia" className="hover:underline">
              {t.completeSeller}
            </Link>
          }
        >
          {t.sellerIncomplete}
        </Alert>
      ) : null}

      {empty ? (
        <EmptyState
          icon={Building2}
          title={t.emptyTitle}
          action={<Button asChild>{addProperty}</Button>}
        />
      ) : (
        <>
          <KeyFigures
            data={overview}
            t={t}
            propertiesShort={dictionary.panel.nav.propertiesShort}
            locale={locale}
          />

          {/*
            Na desktopie dwie kolumny: po lewej zaległości i nieruchomości,
            po prawej terminy, kończące się umowy i wpłaty. Na telefonie jedna
            kolumna w kolejności pilności — nieruchomości na końcu.
          */}
          <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1.63fr)_minmax(0,1fr)] lg:gap-6">
            <DashboardPanel
              title={t.overdueTitle}
              count={overview.arrears.count}
              action={{ label: t.all, href: "/panel/finanse?status=OVERDUE" }}
              className="order-1 lg:order-none"
            >
              <OverdueList data={overview} t={t} locale={locale} />
            </DashboardPanel>

            <DashboardPanel
              title={t.upcomingTitle}
              action={{ label: t.toFinance, href: "/panel/finanse" }}
              className="order-2 lg:order-none"
            >
              <UpcomingList data={overview} t={t} locale={locale} />
            </DashboardPanel>

            <DashboardPanel
              title={t.statProperties}
              count={overview.properties.count}
              action={{ label: t.all, href: "/panel/nieruchomosci" }}
              className="order-4 lg:order-none"
            >
              <PropertyList data={overview} labels={dictionary.panel.propertiesPage.badge} />
            </DashboardPanel>

            <div className="order-3 flex flex-col gap-6 lg:order-none">
              <DashboardPanel
                title={t.expiringTitle}
                action={{ label: t.toLeases, href: "/panel/umowy" }}
              >
                <ExpiringList data={overview} t={t} locale={locale} />
              </DashboardPanel>

              <div className="hidden lg:block">
                <PaymentsTile data={overview} t={t} locale={locale} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

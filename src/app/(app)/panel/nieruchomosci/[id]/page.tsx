import {
  Archive,
  Building2,
  ClipboardCheck,
  Clock,
  FilePlus,
  Globe,
  KeyRound,
  Layers,
  MapPin,
  NotebookPen,
  Pencil,
  Ruler,
  TrainFront,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyExpenses } from "@/components/panel/expenses/property-expenses";
import { PageHeader } from "@/components/panel/page-header";
import { CleaningSchedule } from "@/components/panel/properties/cleaning-schedule";
import { OccupancyBadge } from "@/components/panel/properties/occupancy-badge";
import { PropertyActions } from "@/components/panel/properties/property-actions";
import { PROPERTY_TYPE_ICON } from "@/components/panel/properties/property-icon";
import { RoomsList, type RoomView } from "@/components/panel/properties/rooms-list";
import { InfoSections, nonEmptySections } from "@/components/panel/info-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/ui/money-display";
import { requireOwnerSession } from "@/lib/auth/session";
import { MIN_CLEANING_PARTICIPANTS } from "@/lib/cleaning/rotation";
import { cleaningSchedule } from "@/lib/cleaning/service";
import { accrueRecurringExpenses } from "@/lib/expenses/recurrence";
import { propertyExpenses } from "@/lib/expenses/service";
import type { Locale } from "@/lib/i18n/config";
import { fill, formatArea, formatDateIn } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";
import { formatMoney } from "@/lib/money";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { formatPropertyAddress } from "@/lib/properties/address";
import { getProperty } from "@/lib/properties/service";
import type { MonthlyBalance } from "@/lib/reports/aggregate";
import { propertyMonthlyBalance } from "@/lib/reports/service";
import { cn } from "@/lib/utils";
import { heatingTypeLabels, propertyTypeLabels } from "@/lib/validations/property";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const property = await getProperty(session.user.organizationId, id);

  return { title: property?.name ?? (await panelDictionary()).panel.panelMisc.meta.property };
}

export default async function PropertyDetailPage({ params }: Params) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.propertiesPage.detail;
  const session = await requireOwnerSession();
  const { id } = await params;

  const property = await getProperty(session.user.organizationId, id);
  // Cudze id trafia tutaj tak samo jak nieistniejące — zapytanie było zawężone
  // do organizacji z sesji, więc nic nie wycieka.
  if (!property) notFound();

  // Zaległe pozycje cykliczne doliczamy przed odczytem, tak samo jak na liście
  // kosztów — inaczej karta pokazywałaby sumę sprzed naliczenia.
  await accrueRecurringExpenses(session.user.organizationId);
  const [expenses, balance] = await Promise.all([
    propertyExpenses(session.user.organizationId, property.id),
    propertyMonthlyBalance(session.user.organizationId, property.id),
  ]);

  const rooms: RoomView[] = property.rooms.map((room) => {
    const lease = room.leases[0];
    const tenant = lease?.tenants[0]?.tenant;

    return {
      id: room.id,
      name: room.name,
      status: room.status,
      monthlyRentGrosze: room.monthlyRentGrosze,
      tenantId: tenant?.id ?? null,
      tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : null,
      leaseId: lease?.id ?? null,
    };
  });

  const wholeLease = property.leases[0];
  const wholeTenant = wholeLease?.tenants[0]?.tenant;

  // Cała rozpiska sprzątania od razu: to jedna lista tygodni, którą użytkownik
  // przewija już w przeglądarce, bez wracania na serwer po stronę.
  const cleaning = await cleaningSchedule(session.user.organizationId, property.id);
  const hasCleaning = Boolean(
    cleaning && cleaning.participants.length >= MIN_CLEANING_PARTICIPANTS,
  );

  const now = new Date();
  const address = formatPropertyAddress(property);
  const TypeIcon = PROPERTY_TYPE_ICON[property.type];
  const newLeaseHref = `/panel/umowy/nowa?propertyId=${property.id}`;
  const editHref = `/panel/nieruchomosci/${property.id}/edytuj`;

  // Najem całości ma sens tylko wtedy, gdy nikt jeszcze nie zajmuje pokoi.
  const canLetWhole = !wholeLease && rooms.every((room) => !room.tenantId);

  const occupancy = {
    status: property.status,
    roomCount: rooms.length,
    occupiedRoomCount: rooms.filter((room) => room.status === "OCCUPIED").length,
    availableRoomCount: rooms.filter((room) => room.status === "AVAILABLE").length,
  };

  // Każda sekcja pojawia się dopiero, gdy jest co pokazać — pusta ramka
  // z kreskami odsuwałaby tylko pokoje i koszty w dół.
  const infoSections = nonEmptySections([
    {
      title: t.access,
      icon: KeyRound,
      items: [
        [t.intercom, property.intercomCode],
        [t.storage, property.storageUnit],
        [t.bikeStorage, property.bikeStorage],
        [t.waste, property.wasteDisposal],
      ],
    },
    {
      title: t.buildingManager,
      icon: Building2,
      items: [
        [t.name, property.buildingManagerName],
        [t.phone, property.buildingManagerPhone],
        [t.email, property.buildingManagerEmail],
        [t.address, property.buildingManagerAddress],
      ],
    },
    {
      title: t.utilities,
      icon: Wifi,
      items: [
        [t.heating, property.heatingType ? heatingTypeLabels(d)[property.heatingType] : null],
        [t.internetSpeed, property.internetSpeedMbps ? `${property.internetSpeedMbps} Mbit/s` : null],
        [t.internetProvider, property.internetProvider],
        [t.internetProviderPhone, property.internetProviderPhone],
        [t.wifiSsid, property.wifiSsid],
        [t.wifiPassword, property.wifiPassword],
        [
          t.internetContractEnd,
          property.internetContractEndsAt ? (
            <ContractEnd
              date={property.internetContractEndsAt}
              now={now}
              locale={locale}
              overdueLabel={t.overdue}
            />
          ) : null,
        ],
      ],
    },
    { title: t.inspections, icon: ClipboardCheck, items: [[t.landRegistry, property.landRegistryNumber]] },
    {
      title: t.area,
      icon: TrainFront,
      items: [
        [t.transitLines, property.transitLines],
        [t.nearbyPlaces, property.nearbyPlaces],
      ],
    },
    { title: d.panel.propertiesPage.form.description, icon: Globe, text: property.description },
    { title: t.notes, icon: NotebookPen, text: property.notes },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/nieruchomosci", label: d.panel.panelMisc.propertiesBack }}
        title={property.name}
        badges={
          <>
            <Badge tone="outline" icon={TypeIcon}>
              {propertyTypeLabels(d)[property.type]}
            </Badge>
            <OccupancyBadge property={occupancy} labels={d.panel.propertiesPage.badge} />
            {property.archivedAt ? <Badge tone="warning" icon={Archive}>{t.archived}</Badge> : null}
            {/* Oznaczenie do przyszłej strony ofert — sama strona jest poza
                zakresem, więc plakietka tylko odnotowuje ustawienie. */}
            {property.publiclyListed ? (
              <Badge tone="good" icon={Globe}>
                {t.publiclyListed}
              </Badge>
            ) : null}
            {/* Podnajem widać na pierwszy rzut oka — przy cudzym lokalu
                inaczej wygląda rozliczenie i inaczej kończy się umowa. */}
            {property.owner ? (
              <Badge tone="accent" icon={KeyRound}>
                {t.sublet}
              </Badge>
            ) : null}
          </>
        }
        meta={
          <>
            <Fact icon={MapPin}>
              {address}
              {property.district ? `, ${property.district}` : null}
            </Fact>
            {property.floor !== null ? (
              <Fact icon={Layers}>
                {property.floor === 0
                  ? d.panel.propertiesPage.groundFloor
                  : fill(t.floor, { floor: property.floor })}
              </Fact>
            ) : null}
            {property.areaM2 ? (
              <Fact icon={Ruler}>
                <span className="font-mono">{formatArea(property.areaM2.toString(), locale)}</span>
              </Fact>
            ) : null}
            {property.owner ? (
              <Fact icon={UserRound}>
                <Link
                  href={`/panel/wlasciciele/${property.owner.id}`}
                  className="font-[550] text-accent hover:underline"
                  aria-label={`${t.ownerPrefix}${property.owner.name}`}
                >
                  {property.owner.name}
                </Link>
              </Fact>
            ) : null}
            {property.askingRentGrosze ? (
              <span className="font-mono">
                {fill(t.wholeRent, { amount: formatMoney(property.askingRentGrosze, locale) })}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <PropertyActions
              propertyId={property.id}
              propertyName={property.name}
              archived={property.archivedAt !== null}
            />
            <Button asChild variant="secondary">
              <Link href={editHref}>
                <Pencil className="size-[18px]" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>
          </>
        }
        primary={{ href: newLeaseHref, label: d.panel.leasesPage.newTitle, icon: FilePlus }}
      />

      {/* Bilans obok pokoi: to pierwsze, czego się szuka, zaglądając do lokalu.
          Bez umów i kosztów cyklicznych byłyby same zera, więc wtedy go nie ma. */}
      {balance.incomeGrosze > 0 || balance.expenseGrosze > 0 ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <BalanceCard balance={balance} locale={locale} t={t} />
          <RoomsList
            propertyId={property.id}
            propertyName={property.name}
            rooms={rooms}
            wholePropertyTenant={
              wholeTenant && wholeLease
                ? {
                    id: wholeTenant.id,
                    name: `${wholeTenant.firstName} ${wholeTenant.lastName}`,
                    leaseId: wholeLease.id,
                  }
                : null
            }
            wholeLetHref={canLetWhole ? newLeaseHref : null}
          />
        </div>
      ) : (
        <RoomsList
          propertyId={property.id}
          propertyName={property.name}
          rooms={rooms}
          wholePropertyTenant={
            wholeTenant && wholeLease
              ? {
                  id: wholeTenant.id,
                  name: `${wholeTenant.firstName} ${wholeTenant.lastName}`,
                  leaseId: wholeLease.id,
                }
              : null
          }
          wholeLetHref={canLetWhole ? newLeaseHref : null}
        />
      )}

      {/* Rozpiska ma sens dopiero tam, gdzie jest ją między kogo podzielić:
          dwa pokoje albo dwoje najemców na umowie na całość. */}
      <div className={cn("grid grid-cols-1 items-start gap-6", hasCleaning && "lg:grid-cols-2")}>
        <PropertyExpenses
          propertyId={property.id}
          expenses={expenses.items}
          totalGrosze={expenses.totalGrosze}
          count={expenses.count}
        />
        {hasCleaning && cleaning ? (
          <CleaningSchedule propertyId={property.id} initialSchedule={cleaning} />
        ) : null}
      </div>

      <InfoSections
        sections={infoSections}
        editHref={editHref}
        editLabel={d.panel.common.edit}
      />
    </div>
  );
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
      {children}
    </span>
  );
}

/**
 * Bilans miesięczny lokalu: wynik dużą liczbą, przychód i koszty pod spodem.
 *
 * Znak przed wynikiem jest jawny także na plusie — kolor nie wystarcza,
 * gdy ekran telefonu jest w słońcu albo ktoś nie rozróżnia zieleni.
 */
function BalanceCard({
  balance,
  locale,
  t,
}: {
  balance: MonthlyBalance;
  locale: Locale;
  t: Dictionary["panel"]["propertiesPage"]["detail"];
}) {
  const profit = balance.profitGrosze;
  const tone = profit > 0 ? "text-good" : profit < 0 ? "text-bad" : "text-fg";

  return (
    <section className="flex flex-col gap-5 rounded-tile border border-border bg-surface p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-[550] text-muted">{t.balanceTitle}</h2>
        {profit !== 0 ? (
          <Badge tone={profit > 0 ? "good" : "critical"} icon={profit > 0 ? TrendingUp : TrendingDown}>
            {profit > 0 ? t.balancePositive : t.balanceNegative}
          </Badge>
        ) : null}
      </div>

      <MoneyDisplay
        grosze={profit}
        locale={locale}
        sign
        className={cn("text-[36px] leading-none tracking-[-0.9px] lg:text-[42px] lg:tracking-[-1.1px]", tone)}
      />

      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-muted">{t.balanceIncome}</dt>
          <dd className="font-mono text-[15px] font-semibold text-fg">
            {formatMoney(balance.incomeGrosze, locale)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-muted">{t.balanceExpenses}</dt>
          <dd className="font-mono text-[15px] font-semibold text-fg">
            {formatMoney(balance.expenseGrosze, locale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Koniec umowy na internet — data plus plakietka, gdy już minęła.
 *
 * Termin po fakcie to nie jest ta sama informacja co termin za miesiąc,
 * a z samej daty nikt tego nie wyłapie. Dlatego miniony dostaje kolor,
 * ikonę i etykietę, a nie tylko inny format.
 */
function ContractEnd({
  date,
  now,
  locale,
  overdueLabel,
}: {
  date: Date;
  now: Date;
  locale: Locale;
  overdueLabel: string;
}) {
  const overdue = date < now;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={cn("font-mono", overdue && "text-bad")}>
        {formatDateIn(date, locale, "numeric")}
      </span>
      {overdue ? (
        <Badge size="sm" tone="critical" icon={Clock}>
          {overdueLabel}
        </Badge>
      ) : null}
    </span>
  );
}

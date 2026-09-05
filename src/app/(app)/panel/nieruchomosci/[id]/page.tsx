import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  KeyRound,
  MapPin,
  Pencil,
  TreePine,
  UserPlus,
  Wifi,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyExpenses } from "@/components/panel/expenses/property-expenses";
import { PropertyActions } from "@/components/panel/properties/property-actions";
import { RoomsList, type RoomView } from "@/components/panel/properties/rooms-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { accrueRecurringExpenses } from "@/lib/expenses/recurrence";
import { propertyExpenses } from "@/lib/expenses/service";
import type { Locale } from "@/lib/i18n/config";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { formatPropertyAddress } from "@/lib/properties/address";
import { formatDistance, mapsUrl } from "@/lib/properties/details";
import { getProperty } from "@/lib/properties/service";
import {
  heatingTypeLabels,
  propertyTypeLabels,
  rentalStatusLabels,
  RENTAL_STATUS_TONE,
} from "@/lib/validations/property";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
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
  const expenses = await propertyExpenses(session.user.organizationId, property.id);

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

  const address = formatPropertyAddress(property);
  const now = new Date();

  // Każda sekcja pojawia się dopiero, gdy jest co pokazać — pusta ramka
  // z kreskami odsuwałaby tylko pokoje i koszty w dół.
  const hasAccess = Boolean(
    property.intercomCode ||
      property.checkoutTime ||
      property.storageUnit ||
      property.bikeStorage ||
      property.wasteDisposal,
  );
  const hasManager = Boolean(
    property.buildingManagerName ||
      property.buildingManagerAddress ||
      property.buildingManagerPhone ||
      property.buildingManagerEmail,
  );
  const hasUtilities = Boolean(
    property.heatingType ||
      property.internetProvider ||
      property.internetProviderPhone ||
      property.internetSpeedMbps ||
      property.wifiSsid ||
      property.wifiPassword ||
      property.internetContractEndsAt,
  );
  const hasPapers = Boolean(
    property.landRegistryNumber ||
      property.energyCertificateEp ||
      property.energyCertificateExpiresAt ||
      property.boilerModel ||
      property.boilerInspectionAt ||
      property.technicalInspectionAt,
  );
  const hasNeighbourhood = Boolean(
    property.gpsCoordinates ||
      property.transitLines ||
      property.transitStopDistanceM !== null ||
      property.universityDistanceM !== null ||
      property.nearbyPlaces,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/nieruchomosci"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {d.panel.panelMisc.propertiesBack}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">{property.name}</h1>
              <Badge tone="accent">{propertyTypeLabels(d)[property.type]}</Badge>
              <Badge tone={RENTAL_STATUS_TONE[property.status]}>
                {rentalStatusLabels(d)[property.status]}
              </Badge>
              {property.archivedAt ? <Badge tone="warning">{t.archived}</Badge> : null}
              {/* Oznaczenie do przyszłej strony ofert — sama strona jest poza
                  zakresem, więc badge tylko odnotowuje ustawienie. */}
              {property.publiclyListed ? <Badge tone="good">{t.publiclyListed}</Badge> : null}
              {/* Podnajem widać na pierwszy rzut oka — przy cudzym lokalu
                  inaczej wygląda rozliczenie i inaczej kończy się umowa. */}
              {property.owner ? <Badge tone="accent">{t.sublet}</Badge> : null}
            </div>

            <p className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {address}
              {property.district ? ` · ${property.district}` : null}
            </p>

            {property.owner ? (
              <p className="text-xs text-muted">
                {t.ownerPrefix}
                <Link
                  href={`/panel/wlasciciele/${property.owner.id}`}
                  className="font-medium text-accent hover:underline"
                >
                  {property.owner.name}
                </Link>
              </p>
            ) : null}

            <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
              {property.areaM2 ? (
                <span className="tabular">
                  {locale === "pl"
                    ? property.areaM2.toFixed(2).replace(".", ",")
                    : property.areaM2.toFixed(2)}{" "}
                  m²
                </span>
              ) : null}
              {property.floor !== null ? <span>{fill(t.floor, { floor: property.floor })}</span> : null}
              {property.askingRentGrosze ? (
                <span className="tabular">
                  {fill(t.wholeRent, {
                    amount: formatMoney(property.askingRentGrosze, locale),
                  })}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/nieruchomosci/${property.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>

            <PropertyActions
              propertyId={property.id}
              propertyName={property.name}
              archived={property.archivedAt !== null}
            />
          </div>
        </div>
      </div>

      {property.description ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-fg">
              {property.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

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
      />

      {/* Najem całości ma sens tylko wtedy, gdy nikt jeszcze nie zajmuje pokoi. */}
      {!wholeLease && rooms.every((room) => !room.tenantId) ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[13px] font-semibold text-fg">
                {t.wholeLetTitle}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {t.wholeLetLead}
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/umowy/nowa?propertyId=${property.id}`}>
                <UserPlus className="h-4 w-4" aria-hidden />
                {t.wholeLetButton}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <PropertyExpenses
        propertyId={property.id}
        expenses={expenses.items}
        totalGrosze={expenses.totalGrosze}
        count={expenses.count}
      />

      {hasAccess ? (
        <DetailSection
          title={t.access}
          icon={<KeyRound className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label={t.intercom} value={property.intercomCode} />
          <DetailItem label={t.checkoutTime} value={property.checkoutTime} />
          <DetailItem label={t.storage} value={property.storageUnit} />
          <DetailItem label={t.bikeStorage} value={property.bikeStorage} />
          <DetailItem label={t.waste} value={property.wasteDisposal} />
        </DetailSection>
      ) : null}

      {hasManager ? (
        <DetailSection
          title={t.buildingManager}
          icon={<Building2 className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label={t.name} value={property.buildingManagerName} />
          <DetailItem label={t.address} value={property.buildingManagerAddress} />
          <DetailItem label={t.phone} value={property.buildingManagerPhone} />
          <DetailItem label={t.email} value={property.buildingManagerEmail} />
        </DetailSection>
      ) : null}

      {hasUtilities ? (
        <DetailSection
          title={t.utilities}
          icon={<Wifi className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem
            label={t.heating}
            value={property.heatingType ? heatingTypeLabels(d)[property.heatingType] : null}
          />
          <DetailItem
            label={t.internetSpeed}
            value={property.internetSpeedMbps ? `${property.internetSpeedMbps} Mbit/s` : null}
          />
          <DetailItem label={t.internetProvider} value={property.internetProvider} />
          <DetailItem label={t.internetProviderPhone} value={property.internetProviderPhone} />
          <DetailItem label={t.wifiSsid} value={property.wifiSsid} />
          <DetailItem label={t.wifiPassword} value={property.wifiPassword} />
          <DateItem
            label={t.internetContractEnd}
            date={property.internetContractEndsAt}
            now={now}
            locale={locale}
            overdueSuffix={t.overdue}
          />
        </DetailSection>
      ) : null}

      {hasPapers ? (
        <DetailSection
          title={t.inspections}
          icon={<ClipboardCheck className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label={t.landRegistry} value={property.landRegistryNumber} />
          <DetailItem
            label={t.energyIndex}
            value={
              property.energyCertificateEp
                ? fill(t.energyUnit, {
                    value:
                      locale === "pl"
                        ? property.energyCertificateEp.toFixed(2).replace(".", ",")
                        : property.energyCertificateEp.toFixed(2),
                  })
                : null
            }
          />
          <DateItem
            label={t.certificateValidUntil}
            date={property.energyCertificateExpiresAt}
            now={now}
            locale={locale}
            overdueSuffix={t.overdue}
          />
          <DetailItem label={t.boilerModel} value={property.boilerModel} />
          <DateItem
            label={t.boilerInspection}
            date={property.boilerInspectionAt}
            now={now}
            locale={locale}
            overdueSuffix={t.overdue}
          />
          <DateItem
            label={t.technicalInspection}
            date={property.technicalInspectionAt}
            now={now}
            locale={locale}
            overdueSuffix={t.overdue}
          />
        </DetailSection>
      ) : null}

      {hasNeighbourhood ? (
        <DetailSection
          title={t.area}
          icon={<TreePine className="h-4 w-4 text-muted" aria-hidden />}
        >
          {property.gpsCoordinates ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-xs text-muted">{t.gps}</p>
              {/* Link do map, bo same liczby są tu bezużyteczne — z karty
                  wychodzi się prosto do nawigacji. */}
              <a
                href={mapsUrl(property.gpsCoordinates)}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium text-accent hover:underline"
              >
                {property.gpsCoordinates}
              </a>
            </div>
          ) : null}
          <DetailItem label={t.transitLines} value={property.transitLines} />
          <DetailItem
            label={t.toTransit}
            value={
              property.transitStopDistanceM !== null
                ? formatDistance(property.transitStopDistanceM)
                : null
            }
          />
          <DetailItem
            label={t.toUniversity}
            value={
              property.universityDistanceM !== null
                ? formatDistance(property.universityDistanceM)
                : null
            }
          />
          <DetailItem label={t.nearbyPlaces} value={property.nearbyPlaces} />
        </DetailSection>
      ) : null}

      {property.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="text-[13px] font-semibold text-fg">{t.notes}</p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">
              {property.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Sekcja szczegółów: nagłówek z ikoną i siatka par „etykieta + wartość". */
function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
        {icon}
        {title}
      </h2>
      <Card>
        <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">{children}</CardContent>
      </Card>
    </section>
  );
}

/** Wiersz „etykieta + wartość"; brak wartości znaczy, że pole się nie pokazuje. */
function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm break-words text-fg">{value}</p>
    </div>
  );
}

/**
 * Termin — data plus adnotacja, gdy już minęła.
 *
 * Przegląd po terminie to nie jest ta sama informacja co przegląd za miesiąc,
 * a z samej daty w tabeli nikt tego nie wyłapie. Dlatego minione terminy
 * dostają kolor i podpis, a nie tylko inny format.
 */
function DateItem({
  label,
  date,
  now,
  locale,
  overdueSuffix,
}: {
  label: string;
  date: Date | null;
  now: Date;
  locale: Locale;
  overdueSuffix: string;
}) {
  if (!date) return null;
  const overdue = date < now;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm ${overdue ? "font-medium text-bad" : "text-fg"}`}>
        {formatDateIn(date, locale, "short")}
        {overdue ? overdueSuffix : ""}
      </p>
    </div>
  );
}

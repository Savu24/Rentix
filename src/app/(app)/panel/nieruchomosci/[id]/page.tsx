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
import { formatPLN } from "@/lib/money";
import { formatPropertyAddress } from "@/lib/properties/address";
import { formatDistance, mapsUrl } from "@/lib/properties/details";
import { getProperty } from "@/lib/properties/service";
import {
  HEATING_TYPE_LABEL,
  PROPERTY_TYPE_LABEL,
  RENTAL_STATUS_LABEL,
  RENTAL_STATUS_TONE,
} from "@/lib/validations/property";

type Params = { params: Promise<{ id: string }> };

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const property = await getProperty(session.user.organizationId, id);

  return { title: property?.name ?? "Nieruchomość" };
}

export default async function PropertyDetailPage({ params }: Params) {
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
          Nieruchomości
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">{property.name}</h1>
              <Badge tone="accent">{PROPERTY_TYPE_LABEL[property.type]}</Badge>
              <Badge tone={RENTAL_STATUS_TONE[property.status]}>
                {RENTAL_STATUS_LABEL[property.status]}
              </Badge>
              {property.archivedAt ? <Badge tone="warning">Zarchiwizowana</Badge> : null}
              {/* Oznaczenie do przyszłej strony ofert — sama strona jest poza
                  zakresem, więc badge tylko odnotowuje ustawienie. */}
              {property.publiclyListed ? <Badge tone="good">Oznaczona publicznie</Badge> : null}
              {/* Podnajem widać na pierwszy rzut oka — przy cudzym lokalu
                  inaczej wygląda rozliczenie i inaczej kończy się umowa. */}
              {property.owner ? <Badge tone="accent">Podnajem</Badge> : null}
            </div>

            <p className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {address}
              {property.district ? ` · ${property.district}` : null}
            </p>

            {property.owner ? (
              <p className="text-xs text-muted">
                Właściciel:{" "}
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
                <span className="tabular">{property.areaM2.toFixed(2).replace(".", ",")} m²</span>
              ) : null}
              {property.floor !== null ? <span>piętro {property.floor}</span> : null}
              {property.askingRentGrosze ? (
                <span className="tabular">
                  za całość {formatPLN(property.askingRentGrosze)}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/nieruchomosci/${property.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edytuj
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
                Chcesz wynająć całą nieruchomość jednej osobie?
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Umowa na całość zamiast osobnych umów na pokoje.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/umowy/nowa?propertyId=${property.id}`}>
                <UserPlus className="h-4 w-4" aria-hidden />
                Wynajmij w całości
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
          title="Dostęp do lokalu"
          icon={<KeyRound className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label="Kod do domofonu" value={property.intercomCode} />
          <DetailItem label="Godzina zdania lokalu" value={property.checkoutTime} />
          <DetailItem label="Komórka lokatorska" value={property.storageUnit} />
          <DetailItem label="Miejsce na rowery" value={property.bikeStorage} />
          <DetailItem label="Śmietnik" value={property.wasteDisposal} />
        </DetailSection>
      ) : null}

      {hasManager ? (
        <DetailSection
          title="Administracja budynku"
          icon={<Building2 className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label="Nazwa" value={property.buildingManagerName} />
          <DetailItem label="Adres" value={property.buildingManagerAddress} />
          <DetailItem label="Telefon" value={property.buildingManagerPhone} />
          <DetailItem label="E-mail" value={property.buildingManagerEmail} />
        </DetailSection>
      ) : null}

      {hasUtilities ? (
        <DetailSection
          title="Ogrzewanie i internet"
          icon={<Wifi className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem
            label="Ogrzewanie"
            value={property.heatingType ? HEATING_TYPE_LABEL[property.heatingType] : null}
          />
          <DetailItem
            label="Prędkość łącza"
            value={property.internetSpeedMbps ? `${property.internetSpeedMbps} Mbit/s` : null}
          />
          <DetailItem label="Dostawca internetu" value={property.internetProvider} />
          <DetailItem label="Telefon do dostawcy" value={property.internetProviderPhone} />
          <DetailItem label="Sieć Wi-Fi" value={property.wifiSsid} />
          <DetailItem label="Hasło do Wi-Fi" value={property.wifiPassword} />
          <DateItem
            label="Koniec umowy na internet"
            date={property.internetContractEndsAt}
            now={now}
          />
        </DetailSection>
      ) : null}

      {hasPapers ? (
        <DetailSection
          title="Przeglądy i dokumenty"
          icon={<ClipboardCheck className="h-4 w-4 text-muted" aria-hidden />}
        >
          <DetailItem label="Księga wieczysta" value={property.landRegistryNumber} />
          <DetailItem
            label="Wskaźnik EP"
            value={
              property.energyCertificateEp
                ? `${property.energyCertificateEp.toFixed(2).replace(".", ",")} kWh/(m²·rok)`
                : null
            }
          />
          <DateItem
            label="Ważność świadectwa"
            date={property.energyCertificateExpiresAt}
            now={now}
          />
          <DetailItem label="Model pieca" value={property.boilerModel} />
          <DateItem label="Przegląd pieca" date={property.boilerInspectionAt} now={now} />
          <DateItem label="Przegląd techniczny" date={property.technicalInspectionAt} now={now} />
        </DetailSection>
      ) : null}

      {hasNeighbourhood ? (
        <DetailSection
          title="Okolica i dojazd"
          icon={<TreePine className="h-4 w-4 text-muted" aria-hidden />}
        >
          {property.gpsCoordinates ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-xs text-muted">Współrzędne GPS</p>
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
          <DetailItem label="Linie komunikacji" value={property.transitLines} />
          <DetailItem
            label="Do przystanku"
            value={
              property.transitStopDistanceM !== null
                ? formatDistance(property.transitStopDistanceM)
                : null
            }
          />
          <DetailItem
            label="Do uczelni"
            value={
              property.universityDistanceM !== null
                ? formatDistance(property.universityDistanceM)
                : null
            }
          />
          <DetailItem label="Ważne punkty" value={property.nearbyPlaces} />
        </DetailSection>
      ) : null}

      {property.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="text-[13px] font-semibold text-fg">Notatki wewnętrzne</p>
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
function DateItem({ label, date, now }: { label: string; date: Date | null; now: Date }) {
  if (!date) return null;
  const overdue = date < now;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm ${overdue ? "font-medium text-bad" : "text-fg"}`}>
        {dateFormat.format(date)}
        {overdue ? " · termin minął" : ""}
      </p>
    </div>
  );
}

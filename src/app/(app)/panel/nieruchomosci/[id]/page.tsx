import { ArrowLeft, MapPin, Pencil, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyActions } from "@/components/panel/properties/property-actions";
import { RoomsList, type RoomView } from "@/components/panel/properties/rooms-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatPLN } from "@/lib/money";
import { getProperty } from "@/lib/properties/service";
import {
  PROPERTY_TYPE_LABEL,
  RENTAL_STATUS_LABEL,
  RENTAL_STATUS_TONE,
} from "@/lib/validations/property";

type Params = { params: Promise<{ id: string }> };

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

  const address = `${property.street} ${property.buildingNumber}, ${property.postalCode} ${property.city}`;

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
              {property.publiclyListed ? <Badge tone="good">Publiczna</Badge> : null}
            </div>

            <p className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {address}
              {property.district ? ` · ${property.district}` : null}
            </p>

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

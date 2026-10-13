import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormPage } from "@/components/panel/form-page";
import {
  RoomPricingForm,
  type PricedRoom,
} from "@/components/panel/properties/room-pricing-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatAmount } from "@/lib/money";
import { getProperty } from "@/lib/properties/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { fill } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.panelMisc.roomPricingShort };
}

/**
 * Drugi krok zakładania nieruchomości: wpisanie cen za pokoje.
 *
 * Osobna strona, a nie kolejna sekcja formularza — nieruchomość i pokoje
 * już istnieją, więc przerwanie w tym miejscu niczego nie traci.
 */
export default async function RoomPricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const misc = d.panel.panelMisc;
  const session = await requireOwnerSession();
  const { id } = await params;

  const property = await getProperty(session.user.organizationId, id);
  if (!property) notFound();

  // Bez pokoi nie ma czego wyceniać — nie zostawiamy pustej strony.
  if (property.rooms.length === 0) redirect(`/panel/nieruchomosci/${property.id}`);

  const rooms: PricedRoom[] = property.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    rent: room.monthlyRentGrosze != null ? formatAmount(room.monthlyRentGrosze, locale) : "",
  }));

  return (
    <FormPage
      back={{ href: `/panel/nieruchomosci/${property.id}`, label: property.name }}
      title={misc.roomPricingTitle}
      steps={{ label: misc.steps, items: misc.propertySteps, active: 1 }}
    >
      <div className="flex flex-col gap-4">
        <Alert tone="success">{fill(misc.propertyCreated, { name: property.name })}</Alert>
        <RoomPricingForm propertyId={property.id} initialRooms={rooms} />
      </div>
    </FormPage>
  );
}

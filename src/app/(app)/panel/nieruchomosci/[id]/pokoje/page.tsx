import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  RoomPricingForm,
  type PricedRoom,
} from "@/components/panel/properties/room-pricing-form";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good">
          <Check className="h-3 w-3" aria-hidden />
          {fill(misc.propertyCreated, { name: property.name })}
        </p>

        <h1 className="r-display text-[26px] leading-tight text-fg">
          {misc.roomPricingTitle}
        </h1>
        <p className="text-sm text-muted">
          {misc.roomPricingLead}
        </p>
      </div>

      <RoomPricingForm propertyId={property.id} initialRooms={rooms} />
    </div>
  );
}

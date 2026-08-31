import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyForm } from "@/components/panel/properties/property-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwnersForPicker } from "@/lib/owners/service";
import { getProperty } from "@/lib/properties/service";

export const metadata: Metadata = { title: "Edycja nieruchomości" };

/** Pola dat czytają wyłącznie „RRRR-MM-DD"; brak daty = puste pole. */
const dateValue = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const [property, owners] = await Promise.all([
    getProperty(session.user.organizationId, id),
    listOwnersForPicker(session.user.organizationId),
  ]);
  if (!property) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href={`/panel/nieruchomosci/${property.id}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {property.name}
        </Link>

        <h1 className="r-display text-[26px] leading-tight text-fg">Edycja nieruchomości</h1>
      </div>

      <PropertyForm
        owners={owners}
        propertyId={property.id}
        defaultValues={{
          name: property.name,
          type: property.type,
          areaM2: property.areaM2 ? property.areaM2.toFixed(2) : "",
          floor: property.floor ?? "",
          askingRentGrosze:
            property.askingRentGrosze != null
              ? (property.askingRentGrosze / 100).toFixed(2)
              : "",
          street: property.street,
          buildingNumber: property.buildingNumber,
          apartmentNumber: property.apartmentNumber ?? "",
          ownerId: property.ownerId ?? "",
          postalCode: property.postalCode,
          city: property.city,
          district: property.district ?? "",
          intercomCode: property.intercomCode ?? "",
          checkoutTime: property.checkoutTime ?? "",
          storageUnit: property.storageUnit ?? "",
          bikeStorage: property.bikeStorage ?? "",
          wasteDisposal: property.wasteDisposal ?? "",
          buildingManagerName: property.buildingManagerName ?? "",
          buildingManagerAddress: property.buildingManagerAddress ?? "",
          buildingManagerPhone: property.buildingManagerPhone ?? "",
          buildingManagerEmail: property.buildingManagerEmail ?? "",
          heatingType: property.heatingType ?? "",
          internetProvider: property.internetProvider ?? "",
          internetProviderPhone: property.internetProviderPhone ?? "",
          internetSpeedMbps: property.internetSpeedMbps ?? "",
          wifiSsid: property.wifiSsid ?? "",
          wifiPassword: property.wifiPassword ?? "",
          internetContractEndsAt: dateValue(property.internetContractEndsAt),
          landRegistryNumber: property.landRegistryNumber ?? "",
          energyCertificateEp: property.energyCertificateEp
            ? property.energyCertificateEp.toFixed(2)
            : "",
          energyCertificateExpiresAt: dateValue(property.energyCertificateExpiresAt),
          boilerModel: property.boilerModel ?? "",
          boilerInspectionAt: dateValue(property.boilerInspectionAt),
          technicalInspectionAt: dateValue(property.technicalInspectionAt),
          gpsCoordinates: property.gpsCoordinates ?? "",
          transitLines: property.transitLines ?? "",
          transitStopDistanceM: property.transitStopDistanceM ?? "",
          universityDistanceM: property.universityDistanceM ?? "",
          nearbyPlaces: property.nearbyPlaces ?? "",
          description: property.description ?? "",
          notes: property.notes ?? "",
          publiclyListed: property.publiclyListed,
        }}
      />
    </div>
  );
}

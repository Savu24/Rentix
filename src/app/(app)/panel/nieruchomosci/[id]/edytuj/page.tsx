import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyForm } from "@/components/panel/properties/property-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { getProperty } from "@/lib/properties/service";

export const metadata: Metadata = { title: "Edycja nieruchomości" };

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const property = await getProperty(session.user.organizationId, id);
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
          postalCode: property.postalCode,
          city: property.city,
          district: property.district ?? "",
          description: property.description ?? "",
          notes: property.notes ?? "",
          publiclyListed: property.publiclyListed,
        }}
      />
    </div>
  );
}

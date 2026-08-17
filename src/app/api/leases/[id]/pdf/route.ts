import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api/response";
import { requireApiOwner } from "@/lib/auth/session";
import { getLease } from "@/lib/leases/service";
import { LeaseAgreementDocument, type LeasePdfData } from "@/lib/leases/pdf";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// Osadzanie fontu czyta plik TTF z dysku — to wymaga runtime'u Node.
export const runtime = "nodejs";

/**
 * GET /api/leases/:id/pdf — umowa najmu jako PDF.
 *
 * Generujemy na żądanie, a nie przy zapisie umowy: dane umowy mogą się jeszcze
 * zmieniać, a plik trzymany w magazynie natychmiast rozjechałby się ze stanem
 * w bazie. Podpisany egzemplarz trafi później do tabeli `documents`.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOwner();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const lease = await getLease(auth.organizationId, id);

  if (!lease) return apiError("NOT_FOUND", "Nie znaleziono umowy.");

  // Liczba pokoi na dokument — bierzemy stan faktyczny z bazy, a nie
  // deklarację, bo umowa musi opisywać to, co istnieje.
  const roomCount = await prisma.room.count({
    where: { propertyId: lease.propertyId, archivedAt: null },
  });

  const data: LeasePdfData = {
    number: lease.number,
    startDate: lease.startDate,
    endDate: lease.endDate,
    rentGrosze: lease.rentGrosze,
    depositGrosze: lease.depositGrosze,
    utilitiesMode: lease.utilitiesMode,
    utilitiesAdvanceGrosze: lease.utilitiesAdvanceGrosze,
    billingDay: lease.billingDay,
    paymentTermDays: lease.paymentTermDays,
    notes: lease.notes,

    landlord: {
      name: lease.organization.name,
      taxId: lease.organization.taxId,
      street: lease.organization.street,
      postalCode: lease.organization.postalCode,
      city: lease.organization.city,
    },

    tenants: lease.tenants.map(({ tenant }) => ({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      street: tenant.street,
      postalCode: tenant.postalCode,
      city: tenant.city,
      taxId: tenant.taxId,
      email: tenant.email,
      phone: tenant.phone,
    })),

    property: {
      name: lease.property.name,
      street: lease.property.street,
      buildingNumber: lease.property.buildingNumber,
      apartmentNumber: lease.property.apartmentNumber,
      postalCode: lease.property.postalCode,
      city: lease.property.city,
      // Decimal → tekst z polskim przecinkiem, jak w interfejsie.
      areaM2: lease.property.areaM2 ? lease.property.areaM2.toFixed(2).replace(".", ",") : null,
      floor: lease.property.floor,
      roomCount: roomCount,
    },

    room: lease.room ? { name: lease.room.name } : null,

    issuedAt: new Date(),
    // Miejscowość zawarcia bierzemy z adresu wynajmującego, a w jego braku
    // z adresu nieruchomości — coś musi stanąć w nagłówku dokumentu.
    issuedIn: lease.organization.city ?? lease.property.city,
  };

  const buffer = await renderToBuffer(LeaseAgreementDocument({ data }));

  const filename = `umowa-najmu-${slugify(lease.number ?? lease.property.name)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline` otwiera podgląd w przeglądarce; użytkownik i tak może pobrać.
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

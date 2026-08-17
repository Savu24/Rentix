import { prisma } from "@/lib/prisma";

/**
 * Dane publicznej strony ofert `/o/<slug>`.
 *
 * Osobny moduł od `properties/service.ts`, choć pyta o tę samą tabelę.
 * Powód jest jeden: to zapytanie odpowiada na żądanie **bez sesji**, więc
 * jego `select` jest kontraktem bezpieczeństwa — wszystko, co się w nim
 * znajdzie, zobaczy internet. Współdzielenie selektu z panelem oznaczałoby,
 * że dodanie tam pola „notatki właściciela" ujawnia je publicznie.
 */
export async function getPublicListing(slug: string) {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, city: true },
  });

  if (!organization) return null;

  const properties = await prisma.property.findMany({
    where: {
      organizationId: organization.id,
      publiclyListed: true,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      street: true,
      city: true,
      areaM2: true,
      floor: true,
      askingRentGrosze: true,
      // `description` jest polem opisowym oferty; `notes` to notatki wyłącznie
      // dla właściciela i celowo nie ma go w tym selekcie.
      description: true,
      rooms: {
        where: { archivedAt: null, status: "AVAILABLE" },
        select: { id: true },
      },
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  return {
    organization,
    properties: properties.map((property) => ({
      id: property.id,
      name: property.name,
      type: property.type,
      street: property.street,
      city: property.city,
      // Decimal → tekst z polskim przecinkiem, jak w panelu.
      areaM2: property.areaM2 ? property.areaM2.toFixed(2).replace(".", ",") : null,
      floor: property.floor,
      askingRentGrosze: property.askingRentGrosze,
      description: property.description,
      availableRooms: property.rooms.length,
    })),
  };
}

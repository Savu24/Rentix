import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  OwnerFormOutput,
  OwnerListQuery,
  OwnerUpdateOutput,
} from "@/lib/validations/owner";

/**
 * Właściciele lokali obsługiwanych w podnajmie.
 *
 * Zawężenie do `organizationId` z sesji, jak w pozostałych serwisach.
 */

export type OwnerListItem = Awaited<ReturnType<typeof listOwners>>[number];

export async function listOwners(organizationId: string, query: OwnerListQuery) {
  const where: Prisma.PropertyOwnerWhereInput = {
    organizationId,
    ...(query.includeArchived ? {} : { archivedAt: null }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
            { city: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const owners = await prisma.propertyOwner.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      taxId: true,
      archivedAt: true,
      properties: {
        where: { archivedAt: null },
        select: { id: true, status: true, askingRentGrosze: true },
      },
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
  });

  return owners.map(({ properties, ...owner }) => ({
    ...owner,
    propertyCount: properties.length,
    occupiedCount: properties.filter((property) => property.status === "OCCUPIED").length,
  }));
}

/** Lista do wyboru w formularzu nieruchomości — bez zarchiwizowanych. */
export async function listOwnersForPicker(organizationId: string) {
  return prisma.propertyOwner.findMany({
    where: { organizationId, archivedAt: null },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });
}

export async function getOwner(organizationId: string, ownerId: string) {
  return prisma.propertyOwner.findFirst({
    where: { id: ownerId, organizationId },
    include: {
      properties: {
        orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          street: true,
          buildingNumber: true,
          apartmentNumber: true,
          postalCode: true,
          city: true,
          askingRentGrosze: true,
          archivedAt: true,
        },
      },
    },
  });
}

export async function createOwner(organizationId: string, data: OwnerFormOutput) {
  return prisma.propertyOwner.create({
    data: { organizationId, ...data },
    select: { id: true, name: true },
  });
}

export async function updateOwner(
  organizationId: string,
  ownerId: string,
  data: OwnerUpdateOutput,
) {
  // updateMany zamiast update: pozwala zawęzić po organizationId jednym
  // zapytaniem, bo `update` przyjmuje w `where` tylko klucze unikalne.
  const { count } = await prisma.propertyOwner.updateMany({
    where: { id: ownerId, organizationId },
    data,
  });

  if (count === 0) return null;
  return prisma.propertyOwner.findFirst({ where: { id: ownerId, organizationId } });
}

/**
 * Archiwizacja zamiast usuwania.
 *
 * Właściciel wisi przy nieruchomościach, a te przy umowach i fakturach —
 * skasowanie zerwałoby powiązanie w historii rozliczeń, która ma zostać
 * czytelna także po zakończeniu współpracy.
 */
export async function archiveOwner(organizationId: string, ownerId: string) {
  const { count } = await prisma.propertyOwner.updateMany({
    where: { id: ownerId, organizationId, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  return count > 0;
}

export type DeleteOwnerResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "HAS_PROPERTIES"; propertyCount: number };

/**
 * Trwałe usunięcie — tylko dla właściciela bez przypisanych nieruchomości.
 *
 * Relacja ma SetNull, więc technicznie nic by się nie zepsuło: mieszkania po
 * prostu straciłyby właściciela. Ale strata byłaby cicha — nikt nie zauważy,
 * że lokal przestał być podnajmem, dopóki nie przyjdzie rozliczenie. Lepiej
 * odmówić i kazać najpierw odpiąć nieruchomości.
 */
export async function deleteOwner(
  organizationId: string,
  ownerId: string,
): Promise<DeleteOwnerResult> {
  const owner = await prisma.propertyOwner.findFirst({
    where: { id: ownerId, organizationId },
    select: { id: true, _count: { select: { properties: true } } },
  });
  if (!owner) return { ok: false, reason: "NOT_FOUND" };

  if (owner._count.properties > 0) {
    return { ok: false, reason: "HAS_PROPERTIES", propertyCount: owner._count.properties };
  }

  await prisma.propertyOwner.delete({ where: { id: ownerId } });
  return { ok: true };
}

export async function restoreOwner(organizationId: string, ownerId: string) {
  const { count } = await prisma.propertyOwner.updateMany({
    where: { id: ownerId, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  return count > 0;
}

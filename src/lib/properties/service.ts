import type { Prisma } from "@/generated/prisma/client";
import type { Dictionary } from "@/lib/i18n/types";
import { prisma } from "@/lib/prisma";
import type {
  PropertyCreateOutput,
  PropertyFormOutput,
  PropertyListQuery,
  RoomFormOutput,
} from "@/lib/validations/property";
import { defaultRoomName } from "@/lib/validations/property";

/**
 * Dostęp do nieruchomości i pokoi.
 *
 * Nieruchomość JEST przedmiotem najmu — nie ma warstwy jednostek. Pokoje wiszą
 * bezpośrednio pod nieruchomością i powstają razem z nią.
 *
 * Każda funkcja przyjmuje `organizationId` jako pierwszy argument i wstawia go
 * do WHERE także przy odczycie po id, więc cudzy identyfikator daje
 * „nie znaleziono", a nie cudze dane.
 */

export type PropertyListItem = Awaited<ReturnType<typeof listProperties>>[number];

function buildSearchFilter(q: string | undefined): Prisma.PropertyWhereInput {
  if (!q) return {};
  const contains = { contains: q, mode: "insensitive" as const };
  return {
    OR: [{ name: contains }, { street: contains }, { city: contains }, { district: contains }],
  };
}

export async function listProperties(organizationId: string, query: PropertyListQuery) {
  const properties = await prisma.property.findMany({
    where: {
      organizationId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.type ? { type: query.type } : {}),
      ...buildSearchFilter(query.q),
      // „Z wolnymi" to lokale do wynajęcia, więc remont się tu nie łapie —
      // ma własną pozycję w filtrze.
      ...(query.occupancy === "vacant" ? { status: "AVAILABLE" } : {}),
      ...(query.occupancy === "occupied" ? { status: "OCCUPIED" } : {}),
      ...(query.occupancy === "unavailable" ? { status: "UNAVAILABLE" } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      street: true,
      buildingNumber: true,
      apartmentNumber: true,
      owner: { select: { id: true, name: true } },
      postalCode: true,
      city: true,
      district: true,
      areaM2: true,
      intercomCode: true,
      publiclyListed: true,
      archivedAt: true,
      photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      rooms: {
        where: { archivedAt: null },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
  });

  return properties.map(({ rooms, photos, areaM2, ...property }) => {
    const occupied = rooms.filter((room) => room.status === "OCCUPIED").length;
    const available = rooms.filter((room) => room.status === "AVAILABLE").length;

    return {
      ...property,
      // Decimal nie przechodzi przez granicę serwer→klient.
      areaM2: areaM2 ? areaM2.toFixed(2) : null,
      coverUrl: photos[0]?.url ?? null,
      roomCount: rooms.length,
      occupiedRoomCount: occupied,
      availableRoomCount: available,
    };
  });
}

/** Nieruchomość ze szczegółami: pokoje, ich najemcy i umowa na całość. */
export async function getProperty(organizationId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    include: {
      photos: { orderBy: { position: "asc" } },
      rooms: {
        where: { archivedAt: null },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          leases: {
            where: { status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            take: 1,
            include: {
              tenants: {
                where: { isPrimary: true },
                take: 1,
                include: { tenant: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      // Ustawiony = obsługujemy cudzy lokal; NULL = nieruchomość własna.
      owner: { select: { id: true, name: true } },
      // Umowa na całą nieruchomość — czyli taka, która nie wskazuje pokoju.
      leases: {
        where: { status: "ACTIVE", roomId: null },
        orderBy: { startDate: "desc" },
        take: 1,
        include: {
          tenants: {
            where: { isPrimary: true },
            take: 1,
            include: { tenant: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      },
      _count: { select: { documents: true } },
    },
  });
}

/**
 * Zakłada nieruchomość razem z pokojami.
 *
 * Pokoje powstają w tej samej transakcji co nieruchomość: użytkownik podał ich
 * liczbę, więc nieruchomość bez nich byłaby stanem pośrednim, którego nikt nie
 * zamawiał. Ceny wpisuje w kolejnym kroku.
 */
export async function createProperty(
  organizationId: string,
  data: PropertyCreateOutput,
  /** Nazwy pokoi zakładanych razem z nieruchomością idą za językiem konta. */
  d: Dictionary,
) {
  const { roomCount, ...propertyData } = data;

  return prisma.property.create({
    data: {
      organizationId,
      ...propertyData,
      rooms: {
        create: Array.from({ length: roomCount }, (_, index) => ({
          organizationId,
          name: defaultRoomName(index, d),
          position: index,
        })),
      },
    },
    select: { id: true, name: true, _count: { select: { rooms: true } } },
  });
}

export async function updateProperty(
  organizationId: string,
  propertyId: string,
  data: Partial<PropertyFormOutput>,
) {
  // updateMany zamiast update: pozwala zawęzić po organizationId w jednym
  // zapytaniu. `update` przyjmuje w `where` tylko klucze unikalne.
  const { count } = await prisma.property.updateMany({
    where: { id: propertyId, organizationId },
    data,
  });

  if (count === 0) return null;
  return prisma.property.findFirst({ where: { id: propertyId, organizationId } });
}

/**
 * Archiwizuje nieruchomość razem z pokojami.
 *
 * Nie kasujemy: wiszą przy niej umowy i faktury, czyli historia księgowa.
 */
export async function archiveProperty(organizationId: string, propertyId: string) {
  const now = new Date();

  const [{ count }] = await prisma.$transaction([
    prisma.property.updateMany({
      where: { id: propertyId, organizationId, archivedAt: null },
      data: { archivedAt: now, publiclyListed: false },
    }),
    prisma.room.updateMany({
      where: { propertyId, organizationId, archivedAt: null },
      data: { archivedAt: now },
    }),
  ]);

  return count > 0;
}

export async function restoreProperty(organizationId: string, propertyId: string) {
  const [{ count }] = await prisma.$transaction([
    prisma.property.updateMany({
      where: { id: propertyId, organizationId, archivedAt: { not: null } },
      data: { archivedAt: null },
    }),
    prisma.room.updateMany({ where: { propertyId, organizationId }, data: { archivedAt: null } }),
  ]);

  return count > 0;
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "HAS_LEASES"; leaseCount: number };

/**
 * Trwałe usunięcie — tylko gdy z nieruchomością nigdy nie była związana umowa.
 * Inaczej jedyną drogą jest archiwizacja: kasowanie pociągnęłoby faktury.
 */
export async function deleteProperty(
  organizationId: string,
  propertyId: string,
): Promise<DeleteResult> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true },
  });
  if (!property) return { ok: false, reason: "NOT_FOUND" };

  const leaseCount = await prisma.lease.count({ where: { organizationId, propertyId } });
  if (leaseCount > 0) return { ok: false, reason: "HAS_LEASES", leaseCount };

  await prisma.property.delete({ where: { id: propertyId } });
  return { ok: true };
}

// ── pokoje ───────────────────────────────────────────────────────────────────

export async function listRooms(organizationId: string, propertyId: string) {
  return prisma.room.findMany({
    where: { organizationId, propertyId, archivedAt: null },
    select: { id: true, name: true, status: true, monthlyRentGrosze: true, position: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function createRoom(
  organizationId: string,
  propertyId: string,
  data: RoomFormOutput,
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true, _count: { select: { rooms: true } } },
  });
  if (!property) return null;

  return prisma.room.create({
    data: { organizationId, propertyId, position: property._count.rooms, ...data },
    select: { id: true, name: true, propertyId: true },
  });
}

export async function updateRoom(
  organizationId: string,
  roomId: string,
  data: Partial<RoomFormOutput>,
) {
  const { count } = await prisma.room.updateMany({
    where: { id: roomId, organizationId },
    data,
  });

  if (count === 0) return null;
  return prisma.room.findFirst({ where: { id: roomId, organizationId } });
}

/**
 * Zapisuje nazwy i ceny wszystkich pokoi naraz — krok „wpisz ceny" po
 * założeniu nieruchomości. Jedna transakcja, żeby nie zapisała się połowa.
 */
export async function updateRoomsBulk(
  organizationId: string,
  propertyId: string,
  rooms: Array<{ id: string; name: string; monthlyRentGrosze?: number | null }>,
) {
  const owned = await prisma.room.findMany({
    where: { id: { in: rooms.map((room) => room.id) }, organizationId, propertyId },
    select: { id: true },
  });

  // Każdy identyfikator musi należeć do tej nieruchomości — inaczej jedno
  // żądanie mogłoby przemycić edycję cudzego pokoju.
  if (owned.length !== rooms.length) return null;

  await prisma.$transaction(
    rooms.map((room) =>
      prisma.room.update({
        where: { id: room.id },
        data: {
          name: room.name,
          monthlyRentGrosze: room.monthlyRentGrosze ?? null,
        },
      }),
    ),
  );

  return listRooms(organizationId, propertyId);
}

export async function deleteRoom(
  organizationId: string,
  roomId: string,
): Promise<DeleteResult> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, organizationId },
    select: { id: true },
  });
  if (!room) return { ok: false, reason: "NOT_FOUND" };

  const leaseCount = await prisma.lease.count({ where: { organizationId, roomId } });
  if (leaseCount > 0) return { ok: false, reason: "HAS_LEASES", leaseCount };

  await prisma.room.delete({ where: { id: roomId } });
  return { ok: true };
}

import { prisma } from "@/lib/prisma";
import { formatPropertyAddress } from "@/lib/properties/address";

import {
  MIN_CLEANING_PARTICIPANTS,
  isoDay,
  monthWeeks,
  rotateDuties,
} from "./rotation";

/**
 * Harmonogram sprzątania części wspólnych.
 *
 * Zawężenie do `organizationId` z sesji, jak w pozostałych serwisach: cudze id
 * nieruchomości daje „nie znaleziono", a nie cudzą rozpiskę.
 *
 * Kto sprząta, zależy od tego, jak lokal jest wynajęty. Przy najmie pokojowym
 * dyżury chodzą po pokojach — tak wisi to na lodówce i tak mówi o tym umowa.
 * Przy najmie całości pokoi nikt osobno nie wynajmuje, więc dyżur nosi
 * konkretny najemca z tej jednej umowy.
 */

export type CleaningParticipant = {
  /** Pokój albo najemca całości — jedno z dwóch, nigdy oba naraz. */
  kind: "ROOM" | "TENANT";
  id: string;
  label: string;
};

export type CleaningDutyView = {
  /** Numer tygodnia w miesiącu, licząc od 1. */
  index: number;
  /** Dni kalendarza w zapisie „2026-09-01" — ten sam kształt na serwerze i w API. */
  startsOn: string;
  endsOn: string;
  label: string;
  roomId: string | null;
  tenantId: string | null;
};

export type CleaningMonth = { year: number; monthIndex: number };

export type CleaningScheduleView = {
  participants: CleaningParticipant[];
  duties: CleaningDutyView[];
};

function monthRange({ year, monthIndex }: CleaningMonth) {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

function toView(
  duty: { startsOn: Date; endsOn: Date; label: string; roomId: string | null; tenantId: string | null },
  index: number,
): CleaningDutyView {
  return {
    index: index + 1,
    startsOn: isoDay(duty.startsOn),
    endsOn: isoDay(duty.endsOn),
    label: duty.label,
    roomId: duty.roomId,
    tenantId: duty.tenantId,
  };
}

/**
 * Kto bierze udział w rozpisce tej nieruchomości.
 *
 * `null` znaczy „nie ma takiej nieruchomości". Pusta lista albo lista
 * jednoelementowa znaczy, że harmonogramu nie ma między kim dzielić — wołający
 * sam decyduje, czy to błąd, czy po prostu ukryta sekcja.
 */
export async function cleaningParticipants(
  organizationId: string,
  propertyId: string,
): Promise<CleaningParticipant[] | null> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: {
      rooms: {
        where: { archivedAt: null },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
      // Umowa na całość — czyli taka, która nie wskazuje pokoju.
      leases: {
        where: { status: "ACTIVE", roomId: null },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          tenants: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            select: { tenant: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      },
    },
  });

  if (!property) return null;

  const wholeTenants = property.leases[0]?.tenants ?? [];

  // Najem całości przez kilka osób: dyżur nosi najemca, nie pokój. Przy jednym
  // najemcy całości nie ma czego rozdzielać między ludzi, więc wracamy do
  // pokoi — współlokatorzy bywają dopisani do umowy dopiero później.
  if (wholeTenants.length >= MIN_CLEANING_PARTICIPANTS) {
    return wholeTenants.map(({ tenant }) => ({
      kind: "TENANT" as const,
      id: tenant.id,
      label: `${tenant.firstName} ${tenant.lastName}`,
    }));
  }

  return property.rooms.map((room) => ({ kind: "ROOM" as const, id: room.id, label: room.name }));
}

/** Rozpiska jednego miesiąca razem z listą uczestników. `null` = nie ma nieruchomości. */
export async function cleaningSchedule(
  organizationId: string,
  propertyId: string,
  month: CleaningMonth,
): Promise<CleaningScheduleView | null> {
  const participants = await cleaningParticipants(organizationId, propertyId);
  if (!participants) return null;

  const { start, end } = monthRange(month);
  const duties = await prisma.cleaningDuty.findMany({
    where: { organizationId, propertyId, startsOn: { gte: start, lt: end } },
    orderBy: { startsOn: "asc" },
    select: { startsOn: true, endsOn: true, label: true, roomId: true, tenantId: true },
  });

  return { participants, duties: duties.map(toView) };
}

export type GenerateResult =
  | { ok: true; schedule: CleaningScheduleView }
  | { ok: false; reason: "NOT_FOUND" | "TOO_FEW_PARTICIPANTS"; participantCount?: number };

/**
 * Generuje miesiąc od nowa.
 *
 * Powtórne wywołanie nadpisuje ten miesiąc w całości — to jest „wygeneruj
 * ponownie", a nie druga rozpiska obok pierwszej. Sąsiednie miesiące zostają
 * nietknięte, ale wchodzą do losowania jako warunki brzegowe, żeby nikt nie
 * dostał dwóch tygodni pod rząd na styku.
 */
export async function generateCleaningSchedule(
  organizationId: string,
  propertyId: string,
  month: CleaningMonth,
): Promise<GenerateResult> {
  const participants = await cleaningParticipants(organizationId, propertyId);
  if (!participants) return { ok: false, reason: "NOT_FOUND" };

  if (participants.length < MIN_CLEANING_PARTICIPANTS) {
    return { ok: false, reason: "TOO_FEW_PARTICIPANTS", participantCount: participants.length };
  }

  const { start, end } = monthRange(month);
  const weeks = monthWeeks(month.year, month.monthIndex);

  const neighbours = { organizationId, propertyId };
  const [before, after] = await Promise.all([
    prisma.cleaningDuty.findFirst({
      where: { ...neighbours, startsOn: { lt: start } },
      orderBy: { startsOn: "desc" },
      select: { roomId: true, tenantId: true },
    }),
    prisma.cleaningDuty.findFirst({
      where: { ...neighbours, startsOn: { gte: end } },
      orderBy: { startsOn: "asc" },
      select: { roomId: true, tenantId: true },
    }),
  ]);

  const assigned = rotateDuties(participants, weeks.length, {
    previousId: before?.roomId ?? before?.tenantId ?? null,
    nextId: after?.roomId ?? after?.tenantId ?? null,
  });

  const rows = weeks.map((week, index) => {
    const participant = assigned[index];

    return {
      organizationId,
      propertyId,
      startsOn: week.startsOn,
      endsOn: week.endsOn,
      roomId: participant.kind === "ROOM" ? participant.id : null,
      tenantId: participant.kind === "TENANT" ? participant.id : null,
      // Podpis zapisany teraz: harmonogram bywa już wydrukowany, gdy pokój
      // albo najemca znika z bazy, a pusta kratka nikomu nic nie powie.
      label: participant.label,
    };
  });

  // Kasowanie i wstawianie w jednej transakcji — inaczej nieudany zapis
  // zostawiłby miesiąc pusty, a użytkownik prosił o nowy podział, nie o żaden.
  await prisma.$transaction([
    prisma.cleaningDuty.deleteMany({
      where: { organizationId, propertyId, startsOn: { gte: start, lt: end } },
    }),
    prisma.cleaningDuty.createMany({ data: rows }),
  ]);

  return {
    ok: true,
    schedule: { participants, duties: rows.map(toView) },
  };
}

/** Kasuje rozpiskę jednego miesiąca. Zwraca liczbę skasowanych tygodni. */
export async function clearCleaningSchedule(
  organizationId: string,
  propertyId: string,
  month: CleaningMonth,
): Promise<number> {
  const { start, end } = monthRange(month);
  const { count } = await prisma.cleaningDuty.deleteMany({
    where: { organizationId, propertyId, startsOn: { gte: start, lt: end } },
  });

  return count;
}

export type CleaningPrintout = CleaningScheduleView & {
  propertyName: string;
  propertyAddress: string;
  organizationName: string;
};

/**
 * Rozpiska razem z nagłówkiem wydruku. `null` = nie ma takiej nieruchomości.
 *
 * Adres i nazwa firmy nie są potrzebne na ekranie — tam użytkownik wie, na
 * czyjej karcie stoi. Na kartce wydrukowanej i powieszonej w kuchni to jedyne,
 * co odróżnia ją od rozpiski z sąsiedniego mieszkania.
 */
export async function cleaningPrintout(
  organizationId: string,
  propertyId: string,
  month: CleaningMonth,
): Promise<CleaningPrintout | null> {
  const [property, schedule] = await Promise.all([
    prisma.property.findFirst({
      where: { id: propertyId, organizationId },
      select: {
        name: true,
        street: true,
        buildingNumber: true,
        apartmentNumber: true,
        postalCode: true,
        city: true,
        organization: { select: { name: true } },
      },
    }),
    cleaningSchedule(organizationId, propertyId, month),
  ]);

  if (!property || !schedule) return null;

  return {
    ...schedule,
    propertyName: property.name,
    propertyAddress: formatPropertyAddress(property),
    organizationName: property.organization.name,
  };
}

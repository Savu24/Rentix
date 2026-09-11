import { prisma } from "@/lib/prisma";
import { formatPropertyAddress } from "@/lib/properties/address";

import {
  MAX_CLEANING_RANGE_DAYS,
  MIN_CLEANING_PARTICIPANTS,
  isoDay,
  rangeWeeks,
  rotateDuties,
} from "./rotation";

/**
 * Harmonogram sprzątania części wspólnych.
 *
 * Zawężenie do `organizationId` z sesji, jak w pozostałych serwisach: cudze id
 * nieruchomości daje „nie znaleziono", a nie cudzą rozpiskę.
 *
 * Nieruchomość ma jedną rozpiskę naraz: ciągły zakres od dnia startu do dnia
 * końca, zwykle na rok. Tak wisi to na lodówce — jedna kartka z całym rokiem,
 * a nie dwanaście karteczek, z których wrześniowa gdzieś się zgubiła.
 * Wygenerowanie nowej zastępuje starą w całości.
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
  /** Numer tygodnia w harmonogramie, licząc od 1. */
  index: number;
  /** Dni kalendarza w zapisie „2026-09-01" — ten sam kształt na serwerze i w API. */
  startsOn: string;
  endsOn: string;
  label: string;
  roomId: string | null;
  tenantId: string | null;
};

/** Pierwszy i ostatni dzień rozpiski, w zapisie „2026-09-01". */
export type CleaningRange = { from: string; to: string };

export type CleaningScheduleView = {
  participants: CleaningParticipant[];
  /** `null`, gdy rozpiski jeszcze nie ma. */
  range: CleaningRange | null;
  duties: CleaningDutyView[];
};

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

/** Zakres rozpiski odczytany z jej skrajnych tygodni. */
function rangeOf(duties: CleaningDutyView[]): CleaningRange | null {
  const first = duties[0];
  const last = duties.at(-1);
  if (!first || !last) return null;

  return { from: first.startsOn, to: last.endsOn };
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

/** Rozpiska nieruchomości razem z listą uczestników. `null` = nie ma nieruchomości. */
export async function cleaningSchedule(
  organizationId: string,
  propertyId: string,
): Promise<CleaningScheduleView | null> {
  const participants = await cleaningParticipants(organizationId, propertyId);
  if (!participants) return null;

  const rows = await prisma.cleaningDuty.findMany({
    where: { organizationId, propertyId },
    orderBy: { startsOn: "asc" },
    select: { startsOn: true, endsOn: true, label: true, roomId: true, tenantId: true },
  });
  const duties = rows.map(toView);

  return { participants, range: rangeOf(duties), duties };
}

export type GenerateResult =
  | { ok: true; schedule: CleaningScheduleView }
  | {
      ok: false;
      reason: "NOT_FOUND" | "TOO_FEW_PARTICIPANTS" | "RANGE_INVALID" | "RANGE_TOO_LONG";
    };

/**
 * Rozpisuje zakres od nowa.
 *
 * Powtórne wywołanie zastępuje całą rozpiskę nieruchomości — to jest „wygeneruj
 * ponownie", a nie druga rozpiska obok pierwszej. Stare tygodnie spoza nowego
 * zakresu też znikają: dwie kartki z różnymi datami startu kłóciłyby się
 * o to, kto sprząta w tygodniu, w którym się nakładają.
 */
export async function generateCleaningSchedule(
  organizationId: string,
  propertyId: string,
  range: { from: Date; to: Date },
): Promise<GenerateResult> {
  if (range.to < range.from) return { ok: false, reason: "RANGE_INVALID" };

  const days = Math.round((range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days > MAX_CLEANING_RANGE_DAYS) return { ok: false, reason: "RANGE_TOO_LONG" };

  const participants = await cleaningParticipants(organizationId, propertyId);
  if (!participants) return { ok: false, reason: "NOT_FOUND" };

  if (participants.length < MIN_CLEANING_PARTICIPANTS) {
    return { ok: false, reason: "TOO_FEW_PARTICIPANTS" };
  }

  const weeks = rangeWeeks(range.from, range.to);
  const assigned = rotateDuties(participants, weeks.length);

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
  // zostawiłby nieruchomość bez rozpiski, a użytkownik prosił o nową, nie o żadną.
  await prisma.$transaction([
    prisma.cleaningDuty.deleteMany({ where: { organizationId, propertyId } }),
    prisma.cleaningDuty.createMany({ data: rows }),
  ]);

  const duties = rows.map(toView);

  return {
    ok: true,
    schedule: { participants, range: rangeOf(duties), duties },
  };
}

/** Kasuje rozpiskę nieruchomości. Zwraca liczbę skasowanych tygodni. */
export async function clearCleaningSchedule(
  organizationId: string,
  propertyId: string,
): Promise<number> {
  const { count } = await prisma.cleaningDuty.deleteMany({
    where: { organizationId, propertyId },
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
    cleaningSchedule(organizationId, propertyId),
  ]);

  if (!property || !schedule) return null;

  return {
    ...schedule,
    propertyName: property.name,
    propertyAddress: formatPropertyAddress(property),
    organizationName: property.organization.name,
  };
}

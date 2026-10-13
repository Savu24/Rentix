import { daysOverdue, DUE_SOON_DAYS, remainingGrosze, type InvoiceLike } from "@/lib/invoices/status";
import { resolveLeaseExpiry, type LeaseExpiry } from "@/lib/leases/expiry";

/*
  Wiersze list pulpitu — czyste funkcje bez bazy, żeby reguły („ile dni po
  terminie", „kiedy termin robi się pilny") dało się sprawdzić testem,
  a komponent tylko je rysował.
*/

/** Ile dni do przodu sięga lista „Najbliższe terminy". */
export const UPCOMING_WINDOW_DAYS = 14;

/** Ile pozycji pokazuje każda lista pulpitu. */
export const DASHBOARD_LIST_LIMIT = 5;

type InvoiceRowSource = InvoiceLike & {
  id: string;
  number: string | null;
  buyerName: string;
  lease: { property: { name: string }; room: { name: string } | null } | null;
};

/** „Krowoderska 37/12, Pokój 1" — gdzie, bez adresu, który i tak jest w nazwie. */
export function placeName(
  property: { name: string } | null | undefined,
  room: { name: string } | null | undefined,
): string | null {
  if (!property) return null;
  return room ? `${property.name}, ${room.name}` : property.name;
}

export type OverdueRow = {
  id: string;
  number: string | null;
  buyerName: string;
  place: string | null;
  remainingGrosze: number;
  daysOverdue: number;
};

export function toOverdueRow(invoice: InvoiceRowSource, now: Date): OverdueRow {
  return {
    id: invoice.id,
    number: invoice.number,
    buyerName: invoice.buyerName,
    place: placeName(invoice.lease?.property, invoice.lease?.room),
    remainingGrosze: remainingGrosze(invoice),
    daysOverdue: daysOverdue(invoice.dueDate, now),
  };
}

export type UpcomingRow = {
  id: string;
  buyerName: string;
  place: string | null;
  dueDate: Date;
  /** 0 = termin dziś. */
  daysUntil: number;
  remainingGrosze: number;
  /** Ten sam próg co status „termin za kilka dni" w `resolveInvoiceStatus`. */
  tone: "warning" | "info";
};

export function toUpcomingRow(invoice: InvoiceRowSource, now: Date): UpcomingRow {
  // `|| 0`, bo minus zero przy terminie na dziś psułby porównania i klucze.
  const daysUntil = -daysOverdue(invoice.dueDate, now) || 0;

  return {
    id: invoice.id,
    buyerName: invoice.buyerName,
    place: placeName(invoice.lease?.property, invoice.lease?.room),
    dueDate: invoice.dueDate,
    daysUntil,
    remainingGrosze: remainingGrosze(invoice),
    tone: daysUntil < DUE_SOON_DAYS ? "warning" : "info",
  };
}

export type ExpiringRow = {
  id: string;
  place: string;
  tenants: string[];
  expiry: LeaseExpiry;
};

type LeaseRowSource = {
  id: string;
  endDate: Date | null;
  property: { name: string };
  room: { name: string } | null;
  tenants: { tenant: { firstName: string; lastName: string } }[];
};

/** Wiersz kończącej się umowy albo `null`, gdy umowa jest poza oknem odliczania. */
export function toExpiringRow(lease: LeaseRowSource, now: Date): ExpiringRow | null {
  const expiry = resolveLeaseExpiry(lease.endDate, now);
  if (!expiry) return null;

  return {
    id: lease.id,
    place: placeName(lease.property, lease.room) ?? lease.property.name,
    tenants: lease.tenants.map(({ tenant }) => `${tenant.firstName} ${tenant.lastName}`.trim()),
    expiry,
  };
}

export { occupancyPercent } from "@/lib/properties/occupancy";

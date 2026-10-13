
import {
  DASHBOARD_LIST_LIMIT,
  occupancyPercent,
  toExpiringRow,
  toOverdueRow,
  toUpcomingRow,
  UPCOMING_WINDOW_DAYS,
  type ExpiringRow,
} from "@/lib/dashboard/rows";
import { overdueWhere } from "@/lib/invoices/status";
import { financeSummary } from "@/lib/invoices/service";
import { LEASE_EXPIRY_WINDOW_DAYS } from "@/lib/leases/expiry";
import { prisma } from "@/lib/prisma";
import { listProperties } from "@/lib/properties/service";

/**
 * Wszystko, co pokazuje pulpit, w jednym wywołaniu.
 *
 * Pulpit jest ekranem „co wymaga reakcji" (PRODUCT.md, zasada 4): zaległości
 * i nadchodzące terminy przed resztą. Kwoty i liczniki liczy serwis, a nie
 * strona — te same liczby ma w przyszłości dostać aplikacja mobilna.
 *
 * Sumy zaległości i wpłat pochodzą z `financeSummary`, czyli tego samego
 * źródła co kafle na ekranie Finanse — inaczej oba ekrany mogłyby pokazać
 * dwie różne kwoty zaległości.
 */
export async function dashboardOverview(organizationId: string, now: Date = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const upcomingEnd = new Date(today.getTime() + (UPCOMING_WINDOW_DAYS + 1) * 86_400_000);
  const expiringEnd = new Date(today.getTime() + (LEASE_EXPIRY_WINDOW_DAYS + 1) * 86_400_000);

  const invoiceRowSelect = {
    id: true,
    number: true,
    status: true,
    dueDate: true,
    buyerName: true,
    totalGrossGrosze: true,
    paidGrosze: true,
    lease: {
      select: {
        property: { select: { name: true } },
        room: { select: { name: true } },
      },
    },
  } as const;

  /*
    Dwie tury zapytań zamiast jednej: liczby i lista nieruchomości, potem trzy
    listy pilnych spraw. Jedenaście zapytań naraz zajmowało całą pulę
    połączeń (dziesięć w `pg`) na jedno wejście na pulpit — pooler bazy
    zrywał wtedy nadmiarowe połączenia.
  */
  const [finance, properties, roomsByStatus] = await Promise.all([
    financeSummary(organizationId, now),
    listProperties(organizationId, { occupancy: "all", includeArchived: false }),
    prisma.room.groupBy({
      by: ["status"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
  ]);

  const [overdueInvoices, upcomingInvoices, endingLeases] = await Promise.all([
    // Najstarsze zaległości na górze: im dłużej czekają, tym pilniejsze.
    prisma.invoice.findMany({
      where: { organizationId, ...overdueWhere(now) },
      select: invoiceRowSelect,
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
      take: DASHBOARD_LIST_LIMIT,
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        dueDate: { gte: today, lt: upcomingEnd },
      },
      select: invoiceRowSelect,
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
      take: DASHBOARD_LIST_LIMIT,
    }),
    prisma.lease.findMany({
      where: {
        organizationId,
        archivedAt: null,
        status: "ACTIVE",
        endDate: { gte: today, lt: expiringEnd },
      },
      select: {
        id: true,
        endDate: true,
        property: { select: { name: true } },
        room: { select: { name: true } },
        tenants: {
          orderBy: { isPrimary: "desc" },
          select: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { endDate: "asc" },
      take: DASHBOARD_LIST_LIMIT,
    }),
  ]);

  const roomsWith = (status: string) =>
    roomsByStatus.find((group) => group.status === status)?._count._all ?? 0;
  const roomCount = roomsByStatus.reduce((total, group) => total + group._count._all, 0);
  const occupiedRoomCount = roomsWith("OCCUPIED");
  const vacantRoomCount = roomsWith("AVAILABLE");

  return {
    arrears: { grosze: finance.overdueGrosze, count: finance.overdueCount },
    occupancy: {
      occupied: occupiedRoomCount,
      total: roomCount,
      percent: occupancyPercent(occupiedRoomCount, roomCount),
    },
    properties: {
      count: properties.length,
      underRefurbishment: properties.filter((property) => property.status === "UNAVAILABLE")
        .length,
      // Pierwsze pozycje listy, w tym samym porządku co ekran Nieruchomości.
      rows: properties.slice(0, DASHBOARD_LIST_LIMIT),
    },
    rooms: { count: roomCount, vacant: vacantRoomCount },
    overdue: overdueInvoices.map((invoice) => toOverdueRow(invoice, now)),
    upcoming: upcomingInvoices.map((invoice) => toUpcomingRow(invoice, now)),
    expiring: endingLeases
      .map((lease) => toExpiringRow(lease, now))
      .filter((row): row is ExpiringRow => row !== null),
    payments: {
      grosze: finance.paidThisMonthGrosze,
      count: finance.paidThisMonthCount,
      /** 0 = styczeń; nazwa miesiąca przychodzi ze słownika. */
      month: now.getUTCMonth(),
    },
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof dashboardOverview>>;

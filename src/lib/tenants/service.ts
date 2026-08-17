import type { Prisma } from "@/generated/prisma/client";
import { resolveInvoiceStatus, remainingGrosze } from "@/lib/invoices/status";
import { prisma } from "@/lib/prisma";
import type { TenantFormOutput, TenantListQuery } from "@/lib/validations/tenant";

/**
 * Dostęp do najemców. Jak w `properties/service.ts`: `organizationId` jest
 * pierwszym argumentem każdej funkcji i wchodzi do WHERE także przy odczycie
 * po id, więc cudzy identyfikator daje „nie znaleziono", a nie cudze dane.
 */

export type TenantListItem = Awaited<ReturnType<typeof listTenants>>[number];

function buildSearchFilter(q: string | undefined): Prisma.TenantWhereInput {
  if (!q) return {};
  const contains = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { firstName: contains },
      { lastName: contains },
      { email: contains },
      { phone: contains },
    ],
  };
}

/**
 * Lista najemców ze stanem rozliczeń.
 *
 * Salda liczymy z faktur pobranych razem z najemcami, a nie osobnym zapytaniem
 * na każdego — inaczej lista dwudziestu najemców robiłaby dwadzieścia jeden
 * zapytań do bazy.
 */
export async function listTenants(organizationId: string, query: TenantListQuery) {
  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...buildSearchFilter(query.q),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      archivedAt: true,
      userId: true,
      leases: {
        select: {
          lease: {
            select: {
              id: true,
              status: true,
              rentGrosze: true,
              endDate: true,
              property: { select: { id: true, name: true } },
              room: { select: { id: true, name: true } },
              invoices: {
                where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
                select: {
                  id: true,
                  status: true,
                  dueDate: true,
                  totalGrossGrosze: true,
                  paidGrosze: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ archivedAt: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  const now = new Date();

  const mapped = tenants.map(({ leases, ...tenant }) => {
    const activeLease = leases.map((entry) => entry.lease).find((lease) => lease.status === "ACTIVE");
    const invoices = leases.flatMap((entry) => entry.lease.invoices);

    let outstandingGrosze = 0;
    let overdueCount = 0;

    for (const invoice of invoices) {
      outstandingGrosze += remainingGrosze(invoice);
      if (resolveInvoiceStatus(invoice, now) === "OVERDUE") overdueCount += 1;
    }

    return {
      ...tenant,
      activeLease: activeLease
        ? {
            id: activeLease.id,
            rentGrosze: activeLease.rentGrosze,
            endDate: activeLease.endDate,
            roomName: activeLease.room?.name ?? null,
            propertyId: activeLease.property.id,
            propertyName: activeLease.property.name,
          }
        : null,
      outstandingGrosze,
      overdueCount,
    };
  });

  return query.overdue ? mapped.filter((tenant) => tenant.overdueCount > 0) : mapped;
}

/** Karta najemcy: umowy, faktury, wpłaty i wątki rozmów. */
export async function getTenant(organizationId: string, tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    include: {
      user: { select: { id: true, email: true, lastLoginAt: true } },
      leases: {
        include: {
          lease: {
            include: {
              property: { select: { id: true, name: true, city: true } },
              room: { select: { id: true, name: true } },
              invoices: {
                orderBy: { dueDate: "desc" },
                include: {
                  payments: { orderBy: { paidAt: "desc" } },
                },
              },
            },
          },
        },
      },
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      },
    },
  });
}

export async function createTenant(organizationId: string, data: TenantFormOutput) {
  return prisma.tenant.create({
    data: { organizationId, ...data },
    select: { id: true, firstName: true, lastName: true },
  });
}

export async function updateTenant(
  organizationId: string,
  tenantId: string,
  data: Partial<TenantFormOutput>,
) {
  const { count } = await prisma.tenant.updateMany({
    where: { id: tenantId, organizationId },
    data,
  });

  if (count === 0) return null;
  return prisma.tenant.findFirst({ where: { id: tenantId, organizationId } });
}

export async function archiveTenant(organizationId: string, tenantId: string) {
  const { count } = await prisma.tenant.updateMany({
    where: { id: tenantId, organizationId, archivedAt: null },
    data: { archivedAt: new Date(), status: "FORMER" },
  });
  return count > 0;
}

/**
 * Przywrócenie z archiwum.
 *
 * Status wraca na PROSPECT, a nie na ACTIVE: archiwizacja ustawiła FORMER,
 * a o tym, czy najemca znów jest aktywny, decyduje istnienie umowy, nie sam
 * fakt wyjęcia go z archiwum.
 */
export async function restoreTenant(organizationId: string, tenantId: string) {
  const { count } = await prisma.tenant.updateMany({
    where: { id: tenantId, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null, status: "PROSPECT" },
  });
  return count > 0;
}

export type DeleteTenantResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "HAS_LEASES"; leaseCount: number };

/**
 * Trwałe usunięcie — tylko dla najemcy bez żadnej umowy (np. omyłkowo dodany
 * kontakt). Najemca z historią jest archiwizowany, bo jego dane widnieją
 * na wystawionych fakturach.
 */
export async function deleteTenant(
  organizationId: string,
  tenantId: string,
): Promise<DeleteTenantResult> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    select: { id: true },
  });
  if (!tenant) return { ok: false, reason: "NOT_FOUND" };

  const leaseCount = await prisma.leaseTenant.count({ where: { tenantId } });
  if (leaseCount > 0) return { ok: false, reason: "HAS_LEASES", leaseCount };

  await prisma.tenant.delete({ where: { id: tenantId } });
  return { ok: true };
}

/** Najemcy do wyboru w kreatorze umowy. */
export async function listTenantsForPicker(organizationId: string) {
  return prisma.tenant.findMany({
    where: { organizationId, archivedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      street: true,
      postalCode: true,
      city: true,
      taxId: true,
      documentKind: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

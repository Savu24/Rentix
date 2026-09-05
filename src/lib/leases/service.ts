import type { Prisma } from "@/generated/prisma/client";
import type { LeaseStatus, SubscriptionPlan } from "@/generated/prisma/enums";
import { organizationPlan } from "@/lib/billing/server";
import { remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { prisma } from "@/lib/prisma";
import type {
  LeaseFormOutput,
  LeaseListQuery,
} from "@/lib/validations/lease";

/**
 * Dostęp do umów najmu. Zawężenie do organizacji jak w pozostałych serwisach.
 */

export type LeaseListItem = Awaited<ReturnType<typeof listLeases>>[number];

export async function listLeases(organizationId: string, query: LeaseListQuery) {
  const where: Prisma.LeaseWhereInput = {
    organizationId,
    ...(query.includeArchived ? {} : { archivedAt: null }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    ...(query.expiringInDays
      ? {
          status: "ACTIVE",
          endDate: {
            not: null,
            gte: new Date(),
            lte: new Date(Date.now() + query.expiringInDays * 24 * 60 * 60 * 1000),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { property: { name: { contains: query.q, mode: "insensitive" } } },
            { room: { name: { contains: query.q, mode: "insensitive" } } },
            {
              tenants: {
                some: {
                  tenant: {
                    OR: [
                      { firstName: { contains: query.q, mode: "insensitive" } },
                      { lastName: { contains: query.q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const leases = await prisma.lease.findMany({
    where,
    select: {
      id: true,
      number: true,
      status: true,
      startDate: true,
      endDate: true,
      rentGrosze: true,
      archivedAt: true,
      utilitiesMode: true,
      utilitiesAdvanceGrosze: true,
      property: { select: { id: true, name: true, city: true } },
      room: { select: { id: true, name: true } },
      tenants: {
        orderBy: { isPrimary: "desc" },
        select: {
          isPrimary: true,
          tenant: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      invoices: {
        where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
        select: { status: true, dueDate: true, totalGrossGrosze: true, paidGrosze: true },
      },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  const now = new Date();

  return leases.map(({ invoices, ...lease }) => ({
    ...lease,
    outstandingGrosze: invoices.reduce((total, invoice) => total + remainingGrosze(invoice), 0),
    overdueCount: invoices.filter((invoice) => resolveInvoiceStatus(invoice, now) === "OVERDUE")
      .length,
  }));
}

export async function getLease(organizationId: string, leaseId: string) {
  return prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    include: {
      property: true,
      room: true,
      tenants: {
        orderBy: { isPrimary: "desc" },
        include: { tenant: true },
      },
      invoices: {
        orderBy: { dueDate: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
      organization: true,
    },
  });
}

export type CreateLeaseResult =
  | { ok: true; lease: { id: string } }
  | { ok: false; reason: "PROPERTY_NOT_FOUND" }
  | { ok: false; reason: "ROOM_NOT_FOUND" }
  | { ok: false; reason: "TENANT_NOT_FOUND" }
  | { ok: false; reason: "PROPERTY_OCCUPIED"; conflictingLeaseId: string }
  | { ok: false; reason: "ROOM_OCCUPIED"; conflictingLeaseId: string }
  | { ok: false; reason: "LEASE_LIMIT"; plan: SubscriptionPlan; limit: number };

/**
 * Zakłada umowę i wiąże z nią najemców.
 *
 * Sprawdza, czy jednostka i wszyscy najemcy należą do tej organizacji —
 * bez tego dałoby się podpiąć cudzą jednostkę, podając jej identyfikator.
 * Pilnuje też, żeby jedna jednostka nie miała dwóch aktywnych umów naraz.
 */
export async function createLease(
  organizationId: string,
  data: LeaseFormOutput,
): Promise<CreateLeaseResult> {
  const { tenantIds, ...leaseData } = data;

  /*
    Limit planu sprawdzamy przed czymkolwiek innym: odpowiedź „nie mieścisz
    się w planie" jest prawdziwa niezależnie od tego, czy pozostałe pola są
    poprawne, a kolejność odwrotna kazałaby najpierw poprawiać formularz,
    którego i tak nie da się zapisać.
  */
  const plan = await organizationPlan(organizationId);
  if (!plan.hasCapacity) {
    return { ok: false, reason: "LEASE_LIMIT", plan: plan.plan, limit: plan.limit ?? 0 };
  }

  const property = await prisma.property.findFirst({
    where: { id: leaseData.propertyId, organizationId },
    select: { id: true },
  });
  if (!property) return { ok: false, reason: "PROPERTY_NOT_FOUND" };

  // Pokój musi należeć do tej samej nieruchomości — inaczej umowa wskazywałaby
  // pokój z zupełnie innego mieszkania.
  if (leaseData.roomId) {
    const room = await prisma.room.findFirst({
      where: { id: leaseData.roomId, organizationId, propertyId: leaseData.propertyId },
      select: { id: true },
    });
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
  }

  const tenantCount = await prisma.tenant.count({
    where: { id: { in: tenantIds }, organizationId },
  });
  if (tenantCount !== tenantIds.length) return { ok: false, reason: "TENANT_NOT_FOUND" };

  if (leaseData.status === "ACTIVE") {
    if (leaseData.roomId) {
      // Najem pokojowy: blokuje tylko ten pokój. Sąsiednie pokoje tego samego
      // mieszkania mogą mieć własne, równoległe umowy — o to w tym chodzi.
      const conflict = await prisma.lease.findFirst({
        where: { organizationId, roomId: leaseData.roomId, status: "ACTIVE" },
        select: { id: true },
      });
      if (conflict) {
        return { ok: false, reason: "ROOM_OCCUPIED", conflictingLeaseId: conflict.id };
      }
    } else {
      // Najem całej nieruchomości koliduje z każdą aktywną umową na niej —
      // także z umową na pojedynczy pokój.
      const conflict = await prisma.lease.findFirst({
        where: { organizationId, propertyId: leaseData.propertyId, status: "ACTIVE" },
        select: { id: true },
      });
      if (conflict) {
        return { ok: false, reason: "PROPERTY_OCCUPIED", conflictingLeaseId: conflict.id };
      }
    }
  }

  const lease = await prisma.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        organizationId,
        ...leaseData,
        tenants: {
          create: tenantIds.map((tenantId, index) => ({
            tenantId,
            // Pierwszy z listy jest głównym najemcą — adresatem faktur.
            isPrimary: index === 0,
          })),
        },
      },
      select: { id: true },
    });

    if (leaseData.status === "ACTIVE") {
      if (leaseData.roomId) {
        await tx.room.update({ where: { id: leaseData.roomId }, data: { status: "OCCUPIED" } });

        // Nieruchomość liczy się za wynajętą dopiero, gdy zajęte są wszystkie
        // jej pokoje — przy najmie pokojowym pustostan to wolny pokój,
        // a nie całe mieszkanie.
        const free = await tx.room.count({
          where: { propertyId: leaseData.propertyId, archivedAt: null, status: { not: "OCCUPIED" } },
        });
        await tx.property.update({
          where: { id: leaseData.propertyId },
          data: { status: free === 0 ? "OCCUPIED" : "AVAILABLE" },
        });
      } else {
        await tx.property.update({
          where: { id: leaseData.propertyId },
          data: { status: "OCCUPIED" },
        });
      }

      await tx.tenant.updateMany({
        where: { id: { in: tenantIds } },
        data: { status: "ACTIVE" },
      });
    }

    return created;
  });

  return { ok: true, lease };
}

const findLease = (organizationId: string, leaseId: string) =>
  prisma.lease.findFirst({ where: { id: leaseId, organizationId } });

export type UpdateLeaseResult =
  | { ok: true; lease: Awaited<ReturnType<typeof findLease>> }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "UNIT_OCCUPIED"; conflictingLeaseId: string };

/**
 * Poprawka warunków umowy — razem ze zmianą statusu.
 *
 * Sam status to za mało: umowa przestawiona na „aktywną" zajmuje lokal
 * i robi z najemców najemców czynnych, a cofnięta do szkicu albo rezerwacji
 * musi ten lokal oddać. Bez tego lista nieruchomości pokazywałaby wolne
 * mieszkanie, w którym ktoś mieszka — albo zajęte, w którym nie mieszka nikt.
 * Dlatego status i pozostałe pola idą jedną transakcją.
 */
export async function updateLease(
  organizationId: string,
  leaseId: string,
  data: Record<string, unknown>,
): Promise<UpdateLeaseResult> {
  const { status, ...fields } = data as { status?: LeaseStatus } & Record<string, unknown>;

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    select: {
      id: true,
      status: true,
      propertyId: true,
      roomId: true,
      tenants: { select: { tenantId: true } },
    },
  });
  if (!lease) return { ok: false, reason: "NOT_FOUND" };

  const activating = status === "ACTIVE" && lease.status !== "ACTIVE";
  const releasing = status !== undefined && status !== "ACTIVE" && lease.status === "ACTIVE";

  if (activating) {
    // Ten sam warunek co przy zakładaniu umowy: pokój blokuje sam siebie,
    // najem całości koliduje z każdą aktywną umową na nieruchomości.
    const conflict = await prisma.lease.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        id: { not: leaseId },
        ...(lease.roomId ? { roomId: lease.roomId } : { propertyId: lease.propertyId }),
      },
      select: { id: true },
    });
    if (conflict) {
      return { ok: false, reason: "UNIT_OCCUPIED", conflictingLeaseId: conflict.id };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.lease.update({
      where: { id: leaseId },
      data: { ...fields, ...(status ? { status } : {}) },
    });

    if (activating) {
      if (lease.roomId) {
        await tx.room.update({ where: { id: lease.roomId }, data: { status: "OCCUPIED" } });

        // Nieruchomość jest wynajęta dopiero, gdy zajęte są wszystkie pokoje —
        // tak samo liczy to zakładanie umowy.
        const free = await tx.room.count({
          where: { propertyId: lease.propertyId, archivedAt: null, status: { not: "OCCUPIED" } },
        });
        await tx.property.update({
          where: { id: lease.propertyId },
          data: { status: free === 0 ? "OCCUPIED" : "AVAILABLE" },
        });
      } else {
        await tx.property.update({ where: { id: lease.propertyId }, data: { status: "OCCUPIED" } });
      }

      await tx.tenant.updateMany({
        where: { id: { in: lease.tenants.map(({ tenantId }) => tenantId) } },
        data: { status: "ACTIVE" },
      });
    }

    if (releasing) {
      if (lease.roomId) {
        await tx.room.update({ where: { id: lease.roomId }, data: { status: "AVAILABLE" } });
      }
      await tx.property.update({ where: { id: lease.propertyId }, data: { status: "AVAILABLE" } });

      for (const { tenantId } of lease.tenants) {
        const stillActive = await tx.leaseTenant.count({
          where: { tenantId, lease: { status: "ACTIVE", id: { not: leaseId } } },
        });
        // „Zainteresowany", a nie „były najemca": umowa wróciła do szkicu albo
        // rezerwacji, czyli najem się jeszcze nie zaczął, a nie skończył.
        if (stillActive === 0) {
          await tx.tenant.update({ where: { id: tenantId }, data: { status: "PROSPECT" } });
        }
      }
    }
  });

  return { ok: true, lease: await findLease(organizationId, leaseId) };
}

/**
 * Wypowiedzenie umowy: zmienia status, zwalnia jednostkę i przestawia najemców
 * na „były", o ile nie mają innej aktywnej umowy.
 */
export async function terminateLease(
  organizationId: string,
  leaseId: string,
  data: { terminatedAt: Date; terminationNote?: string | null },
) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    select: { id: true, propertyId: true, roomId: true, tenants: { select: { tenantId: true } } },
  });
  if (!lease) return null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lease.update({
      where: { id: leaseId },
      data: {
        status: "TERMINATED",
        terminatedAt: data.terminatedAt,
        terminationNote: data.terminationNote ?? null,
        endDate: data.terminatedAt,
      },
    });

    // Zwalniamy pokój albo całe mieszkanie — zależnie od tego, co było
    // przedmiotem najmu. Jednostka wraca do puli wolnych w obu przypadkach,
    // bo choć jeden pokój stoi teraz pusty.
    if (lease.roomId) {
      await tx.room.update({ where: { id: lease.roomId }, data: { status: "AVAILABLE" } });
    }
    await tx.property.update({ where: { id: lease.propertyId }, data: { status: "AVAILABLE" } });

    for (const { tenantId } of lease.tenants) {
      const stillActive = await tx.leaseTenant.count({
        where: { tenantId, lease: { status: "ACTIVE", id: { not: leaseId } } },
      });
      if (stillActive === 0) {
        await tx.tenant.update({ where: { id: tenantId }, data: { status: "FORMER" } });
      }
    }

    return updated;
  });
}

/**
 * Archiwizacja umowy.
 *
 * Wyłącznie chowa ją z listy roboczej — faktury, wpłaty i historia rozliczeń
 * zostają nietknięte, bo to dokumenty księgowe, a nie robocza notatka.
 * Aktywnej umowy nie archiwizujemy: najpierw trzeba ją zakończyć, inaczej
 * jednostka zostałaby zajęta przez umowę, której nikt już nie widzi.
 */
export type ArchiveLeaseResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "STILL_ACTIVE" };

export async function archiveLease(
  organizationId: string,
  leaseId: string,
): Promise<ArchiveLeaseResult> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId, archivedAt: null },
    select: { id: true, status: true },
  });
  if (!lease) return { ok: false, reason: "NOT_FOUND" };
  if (lease.status === "ACTIVE") return { ok: false, reason: "STILL_ACTIVE" };

  await prisma.lease.update({ where: { id: leaseId }, data: { archivedAt: new Date() } });
  return { ok: true };
}

export type RestoreLeaseResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "LEASE_LIMIT"; plan: SubscriptionPlan; limit: number };

/**
 * Wyjęcie umowy z archiwum.
 *
 * Podlega limitowi planu tak samo jak zakładanie nowej, bo z punktu widzenia
 * licznika to jest to samo: umowa wraca na listę. Bez tego archiwum byłoby
 * obejściem progu — wystarczyłoby chować i przywracać umowy naprzemiennie.
 */
export async function restoreLease(
  organizationId: string,
  leaseId: string,
): Promise<RestoreLeaseResult> {
  const plan = await organizationPlan(organizationId);
  if (!plan.hasCapacity) {
    return { ok: false, reason: "LEASE_LIMIT", plan: plan.plan, limit: plan.limit ?? 0 };
  }

  const { count } = await prisma.lease.updateMany({
    where: { id: leaseId, organizationId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  return count > 0 ? { ok: true } : { ok: false, reason: "NOT_FOUND" };
}

export type DeleteLeaseResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "HAS_INVOICES"; invoiceCount: number };

/**
 * Trwałe usunięcie — tylko dla umowy, na którą nigdy nic nie wystawiono.
 *
 * Umowa z fakturami jest częścią historii rozliczeń: skasowanie zerwałoby
 * powiązanie dokumentu z przedmiotem najmu, a sam dokument i tak by został.
 */
export async function deleteLease(
  organizationId: string,
  leaseId: string,
): Promise<DeleteLeaseResult> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    select: { id: true, _count: { select: { invoices: true } } },
  });
  if (!lease) return { ok: false, reason: "NOT_FOUND" };

  if (lease._count.invoices > 0) {
    return { ok: false, reason: "HAS_INVOICES", invoiceCount: lease._count.invoices };
  }

  await prisma.lease.delete({ where: { id: leaseId } });
  return { ok: true };
}

/** Nieruchomości z pokojami — do kreatora umowy. */
export async function listPropertiesForPicker(organizationId: string) {
  const properties = await prisma.property.findMany({
    where: { organizationId, archivedAt: null },
    select: {
      id: true,
      name: true,
      city: true,
      status: true,
      askingRentGrosze: true,
      rooms: {
        where: { archivedAt: null },
        select: { id: true, name: true, status: true, monthlyRentGrosze: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return properties.map((property) => ({
    id: property.id,
    label: property.name,
    city: property.city,
    status: property.status,
    askingRentGrosze: property.askingRentGrosze,
    // Pokoje jadą razem z nieruchomościami jednym zapytaniem — kreator nie musi
    // dociągać ich osobno przy każdej zmianie wyboru.
    rooms: property.rooms,
  }));
}

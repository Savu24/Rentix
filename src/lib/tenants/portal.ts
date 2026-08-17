import { remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { prisma } from "@/lib/prisma";

/**
 * Dane panelu najemcy.
 *
 * Osobny moduł od `tenants/service.ts`, bo zawężenie jest tu inne: właściciel
 * pyta o najemców swojej organizacji, najemca pyta wyłącznie o siebie.
 * Punktem wejścia jest `userId` z sesji, nigdy identyfikator z URL-a —
 * inaczej wystarczyłoby podmienić go w adresie, żeby zobaczyć cudzą umowę.
 */
export async function getTenantPortal(userId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organization: {
        select: { name: true, street: true, postalCode: true, city: true, taxId: true },
      },
      leases: {
        orderBy: { lease: { startDate: "desc" } },
        select: {
          lease: {
            select: {
              id: true,
              number: true,
              status: true,
              startDate: true,
              endDate: true,
              rentGrosze: true,
              utilitiesMode: true,
              utilitiesAdvanceGrosze: true,
              billingDay: true,
              paymentTermDays: true,
              property: {
                select: {
                  name: true,
                  street: true,
                  buildingNumber: true,
                  postalCode: true,
                  city: true,
                },
              },
              room: { select: { name: true } },
              invoices: {
                where: { status: { not: "DRAFT" } },
                orderBy: { dueDate: "desc" },
                take: 24,
                select: {
                  id: true,
                  number: true,
                  status: true,
                  issueDate: true,
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
  });

  if (!tenant) return null;

  const now = new Date();
  const leases = tenant.leases.map(({ lease }) => ({
    ...lease,
    invoices: lease.invoices.map((invoice) => ({
      ...invoice,
      displayStatus: resolveInvoiceStatus(invoice, now),
      remainingGrosze: remainingGrosze(invoice),
    })),
  }));

  return {
    tenant: {
      id: tenant.id,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
    },
    landlord: tenant.organization,
    leases,
    /** Ile najemca ma łącznie do zapłaty — najważniejsza liczba na tej stronie. */
    outstandingGrosze: leases
      .flatMap((lease) => lease.invoices)
      .reduce((total, invoice) => total + invoice.remainingGrosze, 0),
  };
}

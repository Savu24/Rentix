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
        select: {
          // Identyfikator wychodzi na zewnątrz, bo strona sprawdza po nim plan
          // wynajmującego: portal jest funkcją planu, a nie stanem najemcy.
          id: true,
          name: true,
          // Kraj wynajmującego — w jego języku najemca ogląda swój portal.
          locale: true,
          street: true,
          postalCode: true,
          city: true,
          taxId: true,
          // Dane do przelewu — najczęstsze pytanie najemcy, który tu wchodzi.
          bankAccount: true,
          contactEmail: true,
        },
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
                  apartmentNumber: true,
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

/**
 * Dokument najemcy do wydruku.
 *
 * Punktem wejścia jest `userId` z sesji, tak samo jak w `getTenantPortal` —
 * identyfikator dokumentu przychodzi z adresu, więc sam w sobie niczego nie
 * dowodzi. Zawężenie idzie po kartotece: dokument musi należeć do umowy,
 * na której figuruje ten najemca, albo być wystawiony wprost na niego.
 *
 * Szkice odpadają: dokument, którego wynajmujący jeszcze nie wystawił, nie ma
 * prawa wyjść do najemcy tylnymi drzwiami.
 *
 * Kształt zapytania jest ten sam co w `invoices/service.getInvoice`, bo
 * renderer PDF-a przyjmuje jeden typ — rozjazd między nimi psułby dokument,
 * a nie zapytanie.
 */
export async function getTenantInvoice(userId: string, invoiceId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { userId },
    select: { id: true, organizationId: true },
  });

  if (!tenant) return null;

  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: tenant.organizationId,
      status: { not: "DRAFT" },
      OR: [
        { tenantId: tenant.id },
        { lease: { tenants: { some: { tenantId: tenant.id } } } },
      ],
    },
    include: {
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      // Ten sam kształt co `getInvoice` — renderer PDF-a przyjmuje jeden typ,
      // a plan rozstrzyga, czy logo w ogóle trafia na dokument.
      organization: { include: { logo: true, subscription: { select: { plan: true } } } },
      tenant: true,
      lease: {
        include: {
          property: true,
          room: true,
          tenants: { orderBy: { isPrimary: "desc" }, include: { tenant: true } },
        },
      },
    },
  });
}

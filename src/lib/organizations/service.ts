import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import type {
  AccountDeleteOutput,
  OrganizationSettingsOutput,
  PasswordChangeOutput,
  ProfileSettingsOutput,
} from "@/lib/validations/settings";

export { isSellerComplete, type SellerData } from "./seller";

/**
 * Ustawienia konta — dane wystawcy dokumentów i profil użytkownika.
 */

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      taxId: true,
      street: true,
      postalCode: true,
      city: true,
      countryCode: true,
    },
  });
}

/**
 * Zapisuje dane wystawcy.
 *
 * `slug` zostaje nietknięty mimo zmiany nazwy: siedzi w publicznych adresach
 * ofert (`/o/<slug>`), więc przestawienie go przy każdej korekcie nazwy
 * zerwałoby linki, które ktoś już gdzieś wkleił.
 */
export async function updateOrganization(
  organizationId: string,
  data: OrganizationSettingsOutput,
) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: data.name,
      taxId: data.taxId,
      street: data.street,
      postalCode: data.postalCode,
      city: data.city,
    },
    select: {
      id: true,
      name: true,
      taxId: true,
      street: true,
      postalCode: true,
      city: true,
    },
  });
}

export async function updateProfile(userId: string, data: ProfileSettingsOutput) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone },
    select: { id: true, name: true, phone: true, email: true },
  });
}

/**
 * Co dokładnie zniknie razem z kontem.
 *
 * Pokazujemy liczby przed usunięciem, a nie ogólne „stracisz swoje dane":
 * „5 nieruchomości, 29 dokumentów" zatrzymuje rękę, a zdanie ogólne nie.
 */
export async function accountDeletionSummary(organizationId: string) {
  const [organization, counts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, _count: { select: { members: true } } },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        _count: {
          select: {
            properties: true,
            tenants: true,
            leases: true,
            invoices: true,
            payments: true,
            expenses: true,
          },
        },
      },
    }),
  ]);

  if (!organization || !counts) return null;

  return {
    organizationName: organization.name,
    /** Konto z innymi członkami usuwa tylko siebie — organizacja zostaje. */
    isLastMember: organization._count.members <= 1,
    properties: counts._count.properties,
    tenants: counts._count.tenants,
    leases: counts._count.leases,
    invoices: counts._count.invoices,
    payments: counts._count.payments,
    expenses: counts._count.expenses,
  };
}

export type DeleteAccountResult =
  | { ok: true; deletedOrganization: boolean }
  | { ok: false; reason: "USER_NOT_FOUND" }
  | { ok: false; reason: "NO_PASSWORD_SET" }
  | { ok: false; reason: "WRONG_PASSWORD" };

/**
 * Usuwa konto wraz z organizacją, gdy jest jej ostatnim członkiem.
 *
 * Kasujemy jawnie, tabela po tabeli, zamiast liczyć na kaskadę z organizacji.
 * Powód jest twardy: `leases.propertyId` i `lease_tenants.tenantId` mają
 * ON DELETE RESTRICT, więc kaskada z organizacji potrafi wywrócić się na
 * ograniczeniu, zanim zdąży usunąć umowy — zależnie od kolejności, w jakiej
 * Postgres zejdzie po relacjach. Jawna kolejność jest przewidywalna.
 *
 * Całość w jednej transakcji: konto usunięte w połowie zostawiłoby dane bez
 * właściciela, do których nikt już się nie zaloguje.
 */
export async function deleteAccount(
  userId: string,
  organizationId: string,
  data: AccountDeleteOutput,
): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };
  if (!user.passwordHash) return { ok: false, reason: "NO_PASSWORD_SET" };

  const matches = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!matches) return { ok: false, reason: "WRONG_PASSWORD" };

  const memberCount = await prisma.membership.count({ where: { organizationId } });
  const deleteOrganization = memberCount <= 1;

  await prisma.$transaction(async (tx) => {
    if (deleteOrganization) {
      const scope = { where: { organizationId } };

      // Kolejność: od liści do korzenia. Pozycje faktur i zdjęcia znikają
      // kaskadą razem ze swoim rodzicem, więc nie ma ich na liście.
      await tx.payment.deleteMany(scope);
      await tx.notification.deleteMany(scope);
      await tx.invoice.deleteMany(scope);
      await tx.expense.deleteMany(scope);
      await tx.document.deleteMany(scope);
      await tx.message.deleteMany(scope);
      await tx.messageThread.deleteMany(scope);
      await tx.meterReading.deleteMany(scope);
      await tx.maintenanceRequest.deleteMany(scope);
      // Umowy przed najemcami i nieruchomościami — powiązania najemca–umowa
      // znikają kaskadą z umowy, a trzymają najemcę więzami RESTRICT.
      await tx.lease.deleteMany(scope);
      await tx.room.deleteMany(scope);
      await tx.property.deleteMany(scope);
      await tx.tenant.deleteMany(scope);
      await tx.membership.deleteMany(scope);
      await tx.organization.delete({ where: { id: organizationId } });
    } else {
      await tx.membership.deleteMany({ where: { organizationId, userId } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true, deletedOrganization: deleteOrganization };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "USER_NOT_FOUND" }
  | { ok: false; reason: "NO_PASSWORD_SET" }
  | { ok: false; reason: "WRONG_PASSWORD" };

/**
 * Zmiana hasła po potwierdzeniu obecnego.
 *
 * Konto założone przez dostawcę zewnętrznego nie ma hasła w bazie — wtedy nie
 * ma czego potwierdzać ani zmieniać, więc odróżniamy ten przypadek od złego
 * hasła zamiast zwracać mylące „nieprawidłowe hasło".
 */
export async function changePassword(
  userId: string,
  data: PasswordChangeOutput,
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };
  if (!user.passwordHash) return { ok: false, reason: "NO_PASSWORD_SET" };

  const matches = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!matches) return { ok: false, reason: "WRONG_PASSWORD" };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });

  return { ok: true };
}

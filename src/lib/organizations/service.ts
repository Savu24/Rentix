import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import type {
  AccountDeleteOutput,
  OrganizationLogoOutput,
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
      contactEmail: true,
      taxId: true,
      street: true,
      postalCode: true,
      city: true,
      countryCode: true,
      bankAccount: true,
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
      contactEmail: data.contactEmail,
      taxId: data.taxId,
      street: data.street,
      postalCode: data.postalCode,
      city: data.city,
      bankAccount: data.bankAccount,
    },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      taxId: true,
      street: true,
      postalCode: true,
      city: true,
      bankAccount: true,
    },
  });
}

/**
 * Logo wystawcy — osobne zapytanie, bo obrazek waży setki kilobajtów.
 *
 * `getOrganization` go nie zwraca celowo: ustawienia i renderer PDF-a proszą
 * o logo wprost, a reszta panelu nie ciągnie go przy okazji.
 */
export async function getOrganizationLogo(organizationId: string) {
  return prisma.organizationLogo.findUnique({
    where: { organizationId },
    select: { dataUrl: true, mimeType: true, updatedAt: true },
  });
}

/** Wgranie logo podmienia poprzednie — jedna organizacja, jeden obrazek. */
export async function saveOrganizationLogo(
  organizationId: string,
  data: OrganizationLogoOutput["dataUrl"],
) {
  return prisma.organizationLogo.upsert({
    where: { organizationId },
    create: { organizationId, dataUrl: data.dataUrl, mimeType: data.mimeType },
    update: { dataUrl: data.dataUrl, mimeType: data.mimeType },
    select: { mimeType: true, updatedAt: true },
  });
}

/** Usunięcie logo wraca do dokumentu bez nagłówka graficznego. */
export async function deleteOrganizationLogo(organizationId: string) {
  const { count } = await prisma.organizationLogo.deleteMany({ where: { organizationId } });
  return count > 0;
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
 * Usuwa konto wraz z każdą organizacją, w której jest ostatnim członkiem.
 *
 * Organizacji bywa kilka: jedno konto prowadzi własny najem i pomaga dwóm
 * innym wynajmującym. Te, w których zostaje ktoś jeszcze, tracą wyłącznie
 * to jedno członkostwo — dane należą do organizacji, nie do osoby, która
 * właśnie odchodzi. Te, w których nie zostaje nikt, znikają w całości:
 * inaczej po skasowaniu konta wisiałaby w bazie organizacja bez wejścia.
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

  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true },
  });

  const counts = await prisma.membership.groupBy({
    by: ["organizationId"],
    where: { organizationId: { in: memberships.map((one) => one.organizationId) } },
    _count: { _all: true },
  });

  const orphaned = counts
    .filter((row) => row._count._all <= 1)
    .map((row) => row.organizationId);

  await prisma.$transaction(async (tx) => {
    for (const organizationId of orphaned) {
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
    }

    // Członkostwa w organizacjach, w których zostaje ktoś jeszcze, znikają
    // kaskadą razem z kontem.
    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true, deletedOrganization: orphaned.length > 0 };
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

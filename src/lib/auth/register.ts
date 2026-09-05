import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { RegisterOutput } from "@/lib/validations/auth";

import { hashPassword } from "./password";

export type RegisterResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; reason: "EMAIL_TAKEN" };

/** Rozpoznaje naruszenie unikalności w Postgresie bez importu typów Prismy. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

/**
 * Buduje slug organizacji unikalny w skali bazy.
 *
 * Slug trafi do publicznego URL-a z ofertami (`/o/<slug>`), więc musi być
 * czytelny; przy kolizji dokładamy licznik zamiast losowego ciągu.
 */
async function uniqueOrganizationSlug(name: string): Promise<string> {
  const base = slugify(name) || "konto";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  // Po 20 kolizjach przestajemy zgadywać i dokładamy losowy sufiks.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Nazwa organizacji dla konta założonego poza formularzem rejestracji.
 *
 * Formularz pyta o nazwę firmy wprost, Google nie ma czego przekazać — bierzemy
 * imię z profilu, a właściciel zmienia je w ustawieniach. Pusta nazwa nie
 * wchodzi w grę: trafia na faktury i do podpisu powiadomień.
 */
function fallbackOrganizationName(user: {
  name: string | null;
  email: string | null;
}): string {
  return user.name?.trim() || user.email?.split("@")[0] || "Moje konto";
}

/**
 * Dokłada organizację kontu, które powstało przez OAuth.
 *
 * Adapter Prismy zapisuje przy logowaniu Google sam wiersz `users` — bez
 * członkostwa panel właściciela pada na `requireOwnerSession`. Wołane z eventu
 * `createUser`, czyli raz na konto, ale i tak idempotentne: konto z członkostwem
 * zostaje bez zmian, bo event potrafi się powtórzyć przy ponowionym żądaniu.
 *
 * Najemca organizacji nie dostaje — jego konto zakłada wynajmujący i to ono
 * wiąże go z kartoteką, a nie z własną firmą.
 */
export async function ensureOwnerOrganization(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      memberships: { select: { id: true }, take: 1 },
    },
  });

  if (!user || user.role === "TENANT" || user.memberships.length > 0) return;

  const name = fallbackOrganizationName(user);
  const slug = await uniqueOrganizationSlug(name);

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      // Subskrypcja od razu z organizacją: plan i próg umów wchodzą wtedy
      // z wartości domyślnych schematu, a panel nie zgaduje ich z braku wiersza.
      data: { name, slug, subscription: { create: {} } },
      select: { id: true },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });
  });
}

/**
 * Zakłada konto właściciela: organizacja + użytkownik + członkostwo.
 *
 * Wszystko w jednej transakcji — konto bez organizacji byłoby nie do użycia
 * (panel właściciela wymaga `organizationId`), a organizacja bez właściciela
 * zostałaby sierotą blokującą slug.
 */
export async function registerOwner(
  input: RegisterOutput,
  /**
   * Wersja krajowa, z której przyszła rejestracja. Zapisujemy ją na
   * organizacji, bo rozstrzyga i o języku panelu, i o rodzaju dokumentów —
   * konto założone na `/uk` ma od pierwszej sekundy widzieć funty i brytyjski
   * rachunek, a nie polską fakturę VAT.
   */
  locale: Locale = DEFAULT_LOCALE,
): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) return { ok: false, reason: "EMAIL_TAKEN" };

  const [passwordHash, slug] = await Promise.all([
    hashPassword(input.password),
    uniqueOrganizationSlug(input.organizationName),
  ]);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          locale,
          subscription: { create: {} },
          // Kraj wystawcy na dokumencie — startowo ten sam, co wersja serwisu.
          // Właściciel może go zmienić w ustawieniach, gdy firma stoi gdzie indziej.
          countryCode: LOCALE_META[locale].countryCode,
        },
        select: { id: true },
      });

      return tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: "OWNER",
          memberships: {
            create: { organizationId: organization.id, role: "OWNER" },
          },
        },
        select: { id: true, email: true, name: true },
      });
    });

    return { ok: true, user };
  } catch (error) {
    // Wyścig: ktoś zarejestrował ten sam e-mail między sprawdzeniem a zapisem.
    if (isUniqueViolation(error)) return { ok: false, reason: "EMAIL_TAKEN" };
    throw error;
  }
}

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { RegisterInput } from "@/lib/validations/auth";

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
 * Zakłada konto właściciela: organizacja + użytkownik + członkostwo.
 *
 * Wszystko w jednej transakcji — konto bez organizacji byłoby nie do użycia
 * (panel właściciela wymaga `organizationId`), a organizacja bez właściciela
 * zostałaby sierotą blokującą slug.
 */
export async function registerOwner(input: RegisterInput): Promise<RegisterResult> {
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
        data: { name: input.organizationName, slug },
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

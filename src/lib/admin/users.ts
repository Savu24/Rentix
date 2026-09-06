import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { UserActionOutput, UserSearch } from "@/lib/validations/admin";

import { recordAdminAction } from "./audit";
import type { AdminActor } from "./session";

/**
 * Konta platformy.
 *
 * Panel administratora nie edytuje cudzych danych osobowych — od tego jest
 * właściciel konta. Zostają dwie operacje, których nikt inny wykonać nie może:
 * nadanie uprawnień administratora i odblokowanie konta z niepotwierdzonym
 * adresem, gdy wiadomość aktywacyjna gdzieś przepadła.
 */

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  /** Czy konto ma w ogóle hasło — konta z Google logują się tylko przez Google. */
  hasPassword: boolean;
  organizations: { id: string; name: string; role: string }[];
};

export async function listAdminUsers(search: UserSearch): Promise<AdminUserRow[]> {
  const q = search.q?.trim();

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(search.role ? { role: search.role } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      passwordHash: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        select: { role: true, organization: { select: { id: true, name: true } } },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    // Sam hash nie opuszcza tej funkcji — na zewnątrz idzie odpowiedź „tak/nie",
    // bo panel potrzebuje tylko tego, czy logowanie hasłem jest dla konta możliwe.
    hasPassword: user.passwordHash !== null,
    organizations: user.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
    })),
  }));
}

export type AdminUserActionResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN"; message: string };

/**
 * Operacja na koncie.
 *
 * Odebranie sobie uprawnień jest zablokowane. Administrator jest zwykle jeden,
 * a panel po takiej zmianie zamyka się przed nim samym — odzyskanie dostępu
 * wymagałoby wtedy wejścia w bazę. Kto chce zejść z roli, robi to skryptem
 * `npm run admin:grant -- adres --revoke`, czyli świadomie i spoza panelu.
 */
export async function runAdminUserAction(
  actor: AdminActor,
  userId: string,
  input: UserActionOutput,
): Promise<AdminUserActionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });

  if (!user) {
    return { ok: false, code: "NOT_FOUND", message: "Nie ma takiego konta." };
  }

  if (input.action === "SET_ROLE") {
    if (user.id === actor.id) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Własnej roli nie zmienisz stąd — użyj skryptu admin:grant --revoke.",
      };
    }

    /*
      Najemcy nie awansujemy i nie degradujemy. Rola TENANT rozstrzyga, do
      którego panelu konto trafia po zalogowaniu, więc podmiana odcięłaby
      najemcę od jego portalu, a wynajmującego wrzuciła do cudzego.
    */
    if (user.role === "TENANT") {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Konto najemcy ma własny portal — zmiana roli odcięłaby je od niego.",
      };
    }

    if (user.role === input.role) return { ok: true };

    await prisma.user.update({ where: { id: user.id }, data: { role: input.role } });

    await recordAdminAction(actor, {
      action: "USER_ROLE_CHANGED",
      targetType: "USER",
      targetId: user.id,
      targetLabel: user.email,
      before: user.role,
      after: input.role,
    });

    return { ok: true };
  }

  if (user.emailVerified) return { ok: true };

  const verifiedAt = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: verifiedAt } });

  await recordAdminAction(actor, {
    action: "USER_EMAIL_VERIFIED",
    targetType: "USER",
    targetId: user.id,
    targetLabel: user.email,
    before: "niepotwierdzony",
    after: verifiedAt.toISOString(),
  });

  return { ok: true };
}

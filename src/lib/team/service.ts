import type { MembershipRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { AssignableRole } from "@/lib/validations/team";

/**
 * Zespół jednej organizacji: kto ma dostęp i kto jest zaproszony.
 *
 * `organizationId` jest pierwszym argumentem każdej funkcji i wchodzi do WHERE
 * także przy operacjach po id, więc cudzy identyfikator daje „nie znaleziono",
 * a nie cudze konto — tak samo jak w pozostałych serwisach.
 */

export type TeamMember = {
  /** Identyfikator członkostwa, nie użytkownika — to on jest przedmiotem operacji. */
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  joinedAt: Date;
  lastLoginAt: Date | null;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: MembershipRole | null;
  invitedBy: string | null;
  createdAt: Date;
  expiresAt: Date;
  /** Zaproszenie po terminie zostaje na liście — inaczej znikałoby bez śladu. */
  expired: boolean;
};

export type TeamOverview = {
  members: TeamMember[];
  invitations: PendingInvitation[];
};

export async function getTeam(organizationId: string): Promise<TeamOverview> {
  const [memberships, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
      },
    }),
    prisma.invitation.findMany({
      where: { organizationId, kind: "TEAM", acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const now = new Date();

  return {
    members: memberships.map((membership) => ({
      id: membership.id,
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      joinedAt: membership.createdAt,
      lastLoginAt: membership.user.lastLoginAt,
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? null,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      expired: invitation.expiresAt <= now,
    })),
  };
}

export type MembershipChangeError =
  | "NOT_FOUND"
  /** Założyciela konta nie da się zmienić ani usunąć — patrz `ASSIGNABLE_ROLES`. */
  | "OWNER_PROTECTED"
  /** Nikt nie odbiera uprawnień sam sobie — to najczęstsza droga do zablokowania konta. */
  | "SELF";

export type MembershipChangeResult =
  | { ok: true }
  | { ok: false; reason: MembershipChangeError };

/** Członkostwo w tej organizacji albo NULL. */
async function findMembership(organizationId: string, membershipId: string) {
  return prisma.membership.findFirst({
    where: { id: membershipId, organizationId },
    select: { id: true, userId: true, role: true },
  });
}

export async function changeMemberRole(
  organizationId: string,
  actingUserId: string,
  membershipId: string,
  role: AssignableRole,
): Promise<MembershipChangeResult> {
  const membership = await findMembership(organizationId, membershipId);

  if (!membership) return { ok: false, reason: "NOT_FOUND" };
  if (membership.role === "OWNER") return { ok: false, reason: "OWNER_PROTECTED" };
  if (membership.userId === actingUserId) return { ok: false, reason: "SELF" };

  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  return { ok: true };
}

/**
 * Odbiera dostęp do organizacji.
 *
 * Kasujemy członkostwo, nie konto: ten sam człowiek bywa współpracownikiem
 * dwóch wynajmujących, a jego konto nie należy do żadnego z nich. Po usunięciu
 * dostęp znika natychmiast, bo `requireApiOwner` sprawdza członkostwo przy
 * każdym żądaniu — token z sesji sam by o tym nie wiedział.
 */
export async function removeMember(
  organizationId: string,
  actingUserId: string,
  membershipId: string,
): Promise<MembershipChangeResult> {
  const membership = await findMembership(organizationId, membershipId);

  if (!membership) return { ok: false, reason: "NOT_FOUND" };
  if (membership.role === "OWNER") return { ok: false, reason: "OWNER_PROTECTED" };
  if (membership.userId === actingUserId) return { ok: false, reason: "SELF" };

  await prisma.membership.delete({ where: { id: membershipId } });
  return { ok: true };
}

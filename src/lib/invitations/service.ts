import type { InvitationKind, MembershipRole } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email/client";
import { teamInvitationEmail, tenantInvitationEmail } from "@/lib/email/invitations";
import { getDictionary } from "@/lib/i18n";
import { membershipRoleLabels } from "@/lib/validations/team";
import { organizationMailSettings } from "@/lib/notifications/settings";
import { prisma } from "@/lib/prisma";

import { hashToken, invitationExpiry, issueToken } from "./tokens";
import { invitationUrl } from "./url";

/**
 * Zaproszenia: wystawianie, cofanie i przyjmowanie.
 *
 * Jedna ścieżka dla współpracownika i dla najemcy — różni je wyłącznie to, co
 * zapisujemy w chwili przyjęcia: członkostwo w organizacji albo dowiązanie
 * konta do kartoteki najemcy. Reszta (token, termin, wysyłka, sprzątanie
 * poprzednich zaproszeń) jest wspólna, patrz komentarz przy modelu.
 *
 * `organizationId` jest pierwszym argumentem każdej funkcji panelu i wchodzi
 * do WHERE także przy odczycie po id — tak samo jak w pozostałych serwisach.
 */

/** Normalizacja adresu: zaproszenia porównuje się z kontami, a te są po małych literach. */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Zastępuje poprzednie oczekujące zaproszenie tego samego celu.
 *
 * Ponowne kliknięcie „wyślij ponownie" ma unieważnić stary link, a nie zostawić
 * dwa ważne naraz: gdyby zostały oba, cofnięcie dostępu przez skasowanie
 * jednego z nich byłoby pozorne.
 */
async function replacePending(
  organizationId: string,
  kind: InvitationKind,
  where: { email?: string; tenantId?: string },
): Promise<void> {
  await prisma.invitation.deleteMany({
    where: { organizationId, kind, acceptedAt: null, ...where },
  });
}

export type IssuedInvitation = {
  id: string;
  email: string;
  expiresAt: Date;
  /** Wynik wysyłki. `false` nie unieważnia zaproszenia — link nadal działa. */
  sent: boolean;
  /** Powód nieudanej wysyłki, do pokazania w panelu. */
  sendError: string | null;
};

// ── Zespół ──────────────────────────────────────────────────────────────────

export type TeamInviteError =
  /** Ten adres ma już konto w tej organizacji. */
  | "ALREADY_MEMBER"
  /** Adres należy do konta najemcy — to inny rodzaj konta, nie da się połączyć. */
  | "TENANT_ACCOUNT";

export type TeamInviteResult =
  | { ok: true; invitation: IssuedInvitation }
  | { ok: false; reason: TeamInviteError };

/**
 * Zaproszenie współpracownika.
 *
 * Konto zapraszanego może już istnieć, i może prowadzić własną organizację
 * albo pracować u dwóch innych wynajmujących — przyjęcie zaproszenia dokłada
 * mu wtedy kolejne członkostwo, a między organizacjami przełącza się w pasku
 * górnym panelu. Dlatego sprawdzamy nie to, czy konto gdzieś już jest, ale
 * czy jest już **tutaj**.
 */
export async function inviteTeamMember(
  organizationId: string,
  invitedById: string,
  input: { email: string; role: MembershipRole },
): Promise<TeamInviteResult> {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      memberships: { select: { organizationId: true } },
    },
  });

  const memberships = existing?.memberships ?? [];

  if (memberships.some((membership) => membership.organizationId === organizationId)) {
    return { ok: false, reason: "ALREADY_MEMBER" };
  }

  if (existing?.role === "TENANT") return { ok: false, reason: "TENANT_ACCOUNT" };

  await replacePending(organizationId, "TEAM", { email });

  const { token, tokenHash } = issueToken();
  const expiresAt = invitationExpiry();

  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      kind: "TEAM",
      email,
      role: input.role,
      tokenHash,
      invitedById,
      expiresAt,
    },
    select: { id: true, email: true, expiresAt: true },
  });

  const mail = await organizationMailSettings(organizationId);
  const d = getDictionary(mail.locale);

  const result = await sendEmail({
    to: email,
    fromName: mail.senderName,
    replyTo: mail.replyTo,
    ...teamInvitationEmail({
      locale: mail.locale,
      organizationName: mail.senderName,
      url: invitationUrl(token),
      expiresAt,
      roleLabel: membershipRoleLabels(d)[input.role],
    }),
  });

  return {
    ok: true,
    invitation: {
      ...invitation,
      sent: result.ok,
      sendError: result.ok ? null : result.error,
    },
  };
}

// ── Portal najemcy ──────────────────────────────────────────────────────────

export type TenantInviteError =
  | "NOT_FOUND"
  /** Kartoteka bez adresu e-mail — nie ma dokąd wysłać linku. */
  | "NO_EMAIL"
  /** Najemca ma już konto; ponowne zaproszenie nic by nie zmieniło. */
  | "ALREADY_LINKED"
  /** Adres należy do konta wynajmującego — jedno konto nie może być obiema stronami. */
  | "OWNER_ACCOUNT";

export type TenantInviteResult =
  | { ok: true; invitation: IssuedInvitation }
  | { ok: false; reason: TenantInviteError };

export async function inviteTenant(
  organizationId: string,
  invitedById: string,
  tenantId: string,
): Promise<TenantInviteResult> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    select: { id: true, firstName: true, email: true, userId: true },
  });

  if (!tenant) return { ok: false, reason: "NOT_FOUND" };
  if (tenant.userId) return { ok: false, reason: "ALREADY_LINKED" };
  if (!tenant.email?.trim()) return { ok: false, reason: "NO_EMAIL" };

  const email = normalizeEmail(tenant.email);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (existing && existing.role !== "TENANT") return { ok: false, reason: "OWNER_ACCOUNT" };

  await replacePending(organizationId, "TENANT", { tenantId });

  const { token, tokenHash } = issueToken();
  const expiresAt = invitationExpiry();

  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      kind: "TENANT",
      email,
      tenantId,
      tokenHash,
      invitedById,
      expiresAt,
    },
    select: { id: true, email: true, expiresAt: true },
  });

  const mail = await organizationMailSettings(organizationId);

  const result = await sendEmail({
    to: email,
    fromName: mail.senderName,
    replyTo: mail.replyTo,
    ...tenantInvitationEmail({
      locale: mail.locale,
      organizationName: mail.senderName,
      recipientName: tenant.firstName,
      url: invitationUrl(token),
      expiresAt,
    }),
  });

  return {
    ok: true,
    invitation: {
      ...invitation,
      sent: result.ok,
      sendError: result.ok ? null : result.error,
    },
  };
}

/**
 * Odbiera najemcy dostęp do portalu.
 *
 * Odpinamy konto od kartoteki i kasujemy oczekujące zaproszenia; samego konta
 * nie ruszamy. Kasowanie go byłoby nieodwracalne i wykraczało poza to, o co
 * prosi wynajmujący — a najemca bywa dopisany do drugiej umowy tydzień później.
 */
export async function revokeTenantPortalAccess(
  organizationId: string,
  tenantId: string,
): Promise<boolean> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    select: { id: true },
  });

  if (!tenant) return false;

  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { userId: null } }),
    prisma.invitation.deleteMany({
      where: { organizationId, kind: "TENANT", tenantId, acceptedAt: null },
    }),
  ]);

  return true;
}

/** Stan dostępu do portalu, pokazywany w kartotece najemcy. */
export type TenantPortalAccess = {
  hasAccount: boolean;
  /** Oczekujące, jeszcze ważne zaproszenie. */
  pending: { id: string; email: string; expiresAt: Date } | null;
};

export async function tenantPortalAccess(
  organizationId: string,
  tenantId: string,
): Promise<TenantPortalAccess> {
  const [tenant, pending] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: tenantId, organizationId },
      select: { userId: true },
    }),
    prisma.invitation.findFirst({
      where: {
        organizationId,
        kind: "TENANT",
        tenantId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, expiresAt: true },
    }),
  ]);

  return { hasAccount: Boolean(tenant?.userId), pending };
}

// ── Cofanie ─────────────────────────────────────────────────────────────────

/** Kasuje oczekujące zaproszenie. Przyjętego nie rusza — to już członkostwo. */
export async function cancelInvitation(
  organizationId: string,
  invitationId: string,
): Promise<boolean> {
  const { count } = await prisma.invitation.deleteMany({
    where: { id: invitationId, organizationId, acceptedAt: null },
  });

  return count > 0;
}

// ── Przyjmowanie ────────────────────────────────────────────────────────────

export type ResolvedInvitation = {
  id: string;
  kind: InvitationKind;
  email: string;
  role: MembershipRole | null;
  organizationName: string;
  organizationLocale: string;
  /** Imię najemcy z kartoteki — powitanie na stronie przyjęcia. */
  recipientName: string | null;
  expiresAt: Date;
  /** Czy adres ma już konto: rozstrzyga, czy pytamy o hasło, czy o zalogowanie. */
  hasAccount: boolean;
};

export type InvitationLookup =
  | { status: "OK"; invitation: ResolvedInvitation }
  /** Token nie istnieje albo zaproszenie zostało cofnięte. */
  | { status: "NOT_FOUND" }
  | { status: "EXPIRED" }
  | { status: "ACCEPTED" };

/**
 * Odczyt zaproszenia po tokenie z adresu.
 *
 * Nie ujawnia niczego przed sprawdzeniem terminu — strona pokazuje nazwę
 * organizacji tylko dla zaproszenia, które da się jeszcze przyjąć.
 */
export async function findInvitation(token: string): Promise<InvitationLookup> {
  if (!token.trim()) return { status: "NOT_FOUND" };

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      kind: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      organization: { select: { name: true, locale: true } },
      tenant: { select: { firstName: true } },
    },
  });

  if (!invitation) return { status: "NOT_FOUND" };
  if (invitation.acceptedAt) return { status: "ACCEPTED" };
  if (invitation.expiresAt <= new Date()) return { status: "EXPIRED" };

  const account = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return {
    status: "OK",
    invitation: {
      id: invitation.id,
      kind: invitation.kind,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      organizationLocale: invitation.organization.locale,
      recipientName: invitation.tenant?.firstName ?? null,
      expiresAt: invitation.expiresAt,
      hasAccount: Boolean(account),
    },
  };
}

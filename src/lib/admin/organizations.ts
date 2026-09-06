import type { Prisma } from "@/generated/prisma/client";
import type { SubscriptionStatus } from "@/generated/prisma/enums";
import { DEFAULT_PLAN, planUsage, type PlanUsage } from "@/lib/billing/plans";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";
import type { OrganizationSearch, SubscriptionUpdateOutput } from "@/lib/validations/admin";

import { recordAdminAction } from "./audit";
import type { AdminActor } from "./session";

/**
 * Organizacje widziane z góry.
 *
 * To jedyne miejsce w kodzie, które czyta dane wszystkich kont naraz — reszta
 * aplikacji zawęża każde zapytanie do `organizationId` zalogowanego. Dlatego
 * wszystko tutaj wisi za `requireAdminSession` / `requireApiAdmin`.
 */

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  locale: Locale;
  createdAt: Date;
  ownerEmail: string | null;
  members: number;
  usage: PlanUsage;
  status: SubscriptionStatus;
  billingExempt: boolean;
  currentPeriodEnd: Date | null;
};

const SUBSCRIPTION_SELECT = {
  plan: true,
  status: true,
  leaseLimit: true,
  billingExempt: true,
  currentPeriodEnd: true,
} as const;

/** Konto bez wiersza subskrypcji jest darmowe i aktywne — tak samo widzi je panel. */
const NO_SUBSCRIPTION = {
  plan: DEFAULT_PLAN,
  status: "ACTIVE" as SubscriptionStatus,
  leaseLimit: null as number | null,
  billingExempt: false,
  currentPeriodEnd: null as Date | null,
};

function toLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Lista organizacji z zużyciem limitu.
 *
 * Umowy liczy osobne `groupBy`, a nie `_count` w zapytaniu głównym, bo do
 * limitu wchodzą wyłącznie umowy poza archiwum — policzone bez tego filtru
 * pokazywałyby konta „ponad limit", które w rzeczywistości mieszczą się
 * w planie (patrz `countLeases` w `billing/server.ts`).
 */
export async function listAdminOrganizations(
  search: OrganizationSearch,
): Promise<AdminOrganizationRow[]> {
  const q = search.q?.trim();

  const filters: Prisma.OrganizationWhereInput[] = [];

  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { taxId: { contains: q, mode: "insensitive" } },
        { members: { some: { user: { email: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  /*
    Plan darmowy i status aktywny obejmują też konta bez wiersza subskrypcji —
    inaczej filtr gubiłby dokładnie te konta, o które przy nim chodzi.
  */
  if (search.plan) {
    filters.push(
      search.plan === "FREE"
        ? { OR: [{ subscription: { plan: "FREE" } }, { subscription: { is: null } }] }
        : { subscription: { plan: search.plan } },
    );
  }

  if (search.status) {
    filters.push(
      search.status === "ACTIVE"
        ? { OR: [{ subscription: { status: "ACTIVE" } }, { subscription: { is: null } }] }
        : { subscription: { status: search.status } },
    );
  }

  const organizations = await prisma.organization.findMany({
    where: filters.length > 0 ? { AND: filters } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      locale: true,
      createdAt: true,
      subscription: { select: SUBSCRIPTION_SELECT },
      _count: { select: { members: true } },
      members: {
        where: { role: "OWNER" },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { user: { select: { email: true } } },
      },
    },
  });

  const leaseCounts = await countLeasesByOrganization(organizations.map((row) => row.id));

  return organizations.map((organization) => {
    const subscription = organization.subscription ?? NO_SUBSCRIPTION;

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      locale: toLocale(organization.locale),
      createdAt: organization.createdAt,
      ownerEmail: organization.members[0]?.user.email ?? null,
      members: organization._count.members,
      usage: planUsage(
        subscription.plan,
        subscription.leaseLimit,
        leaseCounts.get(organization.id) ?? 0,
      ),
      status: subscription.status,
      billingExempt: subscription.billingExempt,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  });
}

/** Umowy poza archiwum, pogrupowane po organizacji. Pusta lista id → pusta mapa. */
export async function countLeasesByOrganization(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const grouped = await prisma.lease.groupBy({
    by: ["organizationId"],
    where: { organizationId: { in: ids }, archivedAt: null },
    _count: { _all: true },
  });

  return new Map(grouped.map((row) => [row.organizationId, row._count._all]));
}

export type AdminOrganizationMember = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  platformRole: string;
  lastLoginAt: Date | null;
  joinedAt: Date;
};

export type AdminOrganizationDetail = AdminOrganizationRow & {
  contactEmail: string | null;
  taxId: string | null;
  city: string | null;
  bankAccount: string | null;
  memberList: AdminOrganizationMember[];
  counts: {
    properties: number;
    leasesActive: number;
    leasesArchived: number;
    tenants: number;
    invoices: number;
    payments: number;
  };
  /** Suma brutto wszystkich faktur konta w groszach — skala, nie księgowość. */
  invoicedGrosze: number;
};

export async function getAdminOrganization(id: string): Promise<AdminOrganizationDetail | null> {
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      locale: true,
      createdAt: true,
      contactEmail: true,
      taxId: true,
      city: true,
      bankAccount: true,
      subscription: { select: SUBSCRIPTION_SELECT },
      _count: {
        select: { members: true, properties: true, tenants: true, invoices: true, payments: true },
      },
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true, role: true, lastLoginAt: true } },
        },
      },
    },
  });

  if (!organization) return null;

  const [leasesActive, leasesArchived, invoiced] = await Promise.all([
    prisma.lease.count({ where: { organizationId: id, archivedAt: null } }),
    prisma.lease.count({ where: { organizationId: id, archivedAt: { not: null } } }),
    prisma.invoice.aggregate({
      where: { organizationId: id },
      _sum: { totalGrossGrosze: true },
    }),
  ]);

  const subscription = organization.subscription ?? NO_SUBSCRIPTION;
  const owner = organization.members.find((member) => member.role === "OWNER");

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    locale: toLocale(organization.locale),
    createdAt: organization.createdAt,
    ownerEmail: owner?.user.email ?? null,
    members: organization._count.members,
    usage: planUsage(subscription.plan, subscription.leaseLimit, leasesActive),
    status: subscription.status,
    billingExempt: subscription.billingExempt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    contactEmail: organization.contactEmail,
    taxId: organization.taxId,
    city: organization.city,
    bankAccount: organization.bankAccount,
    memberList: organization.members.map((member) => ({
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      platformRole: member.user.role,
      lastLoginAt: member.user.lastLoginAt,
      joinedAt: member.createdAt,
    })),
    counts: {
      properties: organization._count.properties,
      leasesActive,
      leasesArchived,
      tenants: organization._count.tenants,
      invoices: organization._count.invoices,
      payments: organization._count.payments,
    },
    invoicedGrosze: invoiced._sum.totalGrossGrosze ?? 0,
  };
}

/**
 * Zmiana subskrypcji konta.
 *
 * `upsert`, bo konto sprzed cennika może w ogóle nie mieć wiersza subskrypcji.
 * Panel klienta radzi sobie z jego brakiem (`organizationPlan`), ale zmiana
 * planu musi go wtedy założyć, a nie paść na „nie znaleziono".
 *
 * Każde ruszone pole idzie do dziennika osobno: pytanie „kto podniósł temu
 * kontu limit" zadaje się o jedno pole, a nie o cały formularz.
 */
export async function updateAdminSubscription(
  actor: AdminActor,
  organizationId: string,
  input: SubscriptionUpdateOutput,
): Promise<AdminOrganizationDetail | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, subscription: { select: SUBSCRIPTION_SELECT } },
  });

  if (!organization) return null;

  const current = organization.subscription ?? NO_SUBSCRIPTION;

  const next = {
    plan: input.plan ?? current.plan,
    leaseLimit: input.leaseLimit !== undefined ? input.leaseLimit : current.leaseLimit,
    billingExempt: input.billingExempt ?? current.billingExempt,
    status: input.status ?? current.status,
  };

  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...next },
    update: next,
  });

  const limitLabel = (value: number | null) => (value === null ? "próg planu" : String(value));
  const flagLabel = (value: boolean) => (value ? "tak" : "nie");

  const changes = [
    next.plan !== current.plan
      ? (["PLAN_CHANGED", current.plan, next.plan] as const)
      : null,
    next.leaseLimit !== current.leaseLimit
      ? ([
          "LEASE_LIMIT_CHANGED",
          limitLabel(current.leaseLimit),
          limitLabel(next.leaseLimit),
        ] as const)
      : null,
    next.billingExempt !== current.billingExempt
      ? ([
          "BILLING_EXEMPT_CHANGED",
          flagLabel(current.billingExempt),
          flagLabel(next.billingExempt),
        ] as const)
      : null,
    next.status !== current.status
      ? (["SUBSCRIPTION_STATUS_CHANGED", current.status, next.status] as const)
      : null,
  ].filter((change) => change !== null);

  for (const [action, before, after] of changes) {
    await recordAdminAction(actor, {
      action,
      targetType: "ORGANIZATION",
      targetId: organization.id,
      targetLabel: organization.name,
      before,
      after,
    });
  }

  return getAdminOrganization(organizationId);
}

import type { SubscriptionPlan } from "@/generated/prisma/enums";
import { PLAN_PRICE } from "@/lib/billing/plans";
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";

/**
 * Liczby całej platformy.
 *
 * Jeden ekran ma odpowiadać na pytanie „jak stoimy": ile kont, ile z nich
 * płaci, ile pracy klienci przez nas przepuszczają. Wszystko liczone zapytaniem
 * agregującym, nigdy przez pobranie rekordów i policzenie ich w JavaScripcie —
 * ten ekran ma działać tak samo przy stu kontach i przy stu tysiącach.
 */

const DAY = 24 * 60 * 60 * 1000;

export type PlanBreakdown = { plan: SubscriptionPlan; organizations: number };

export type RevenueLine = {
  locale: Locale;
  /** Miesięcznie, w groszach albo pensach — waluty się nie sumują. */
  amount: number;
  /** Ile kont składa się na tę kwotę. */
  accounts: number;
};

export type PlatformStats = {
  organizations: number;
  organizationsLast30Days: number;
  users: number;
  admins: number;
  tenantAccounts: number;
  properties: number;
  leases: number;
  tenants: number;
  invoicesLast30Days: number;
  plans: PlanBreakdown[];
  revenue: RevenueLine[];
  /** Konta zwolnione z opłat: korzystają z płatnego planu, nie płacąc za niego. */
  billingExempt: number;
};

const PLAN_ORDER: SubscriptionPlan[] = ["FREE", "START", "PRO", "PORTFOLIO"];

export async function platformStats(): Promise<PlatformStats> {
  const since30Days = new Date(Date.now() - 30 * DAY);

  const [
    organizations,
    organizationsLast30Days,
    users,
    admins,
    tenantAccounts,
    properties,
    leases,
    tenants,
    invoicesLast30Days,
    planGroups,
    billingExempt,
    paying,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: since30Days } } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.property.count(),
    prisma.lease.count({ where: { archivedAt: null } }),
    prisma.tenant.count(),
    prisma.invoice.count({ where: { createdAt: { gte: since30Days } } }),
    prisma.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.subscription.count({ where: { billingExempt: true } }),
    /*
      Przychód liczymy z wierszy, a nie agregatem, bo kwota zależy od dwóch
      tabel naraz: plan siedzi w subskrypcji, a waluta w wersji krajowej
      organizacji. Zbiór to wyłącznie konta płacące — a tych z definicji jest
      mniej niż wszystkich.
    */
    prisma.subscription.findMany({
      where: { status: "ACTIVE", billingExempt: false, plan: { not: "FREE" } },
      select: { plan: true, organization: { select: { locale: true } } },
    }),
  ]);

  const counted = new Map(planGroups.map((group) => [group.plan, group._count._all]));

  /*
    Konta bez wiersza subskrypcji doliczamy do planu darmowego — tak samo widzi
    je `organizationPlan`, więc panel administratora i panel klienta mówią
    o tym samym koncie to samo.
  */
  const withSubscription = planGroups.reduce((sum, group) => sum + group._count._all, 0);
  const withoutSubscription = organizations - withSubscription;

  const plans: PlanBreakdown[] = PLAN_ORDER.map((plan) => ({
    plan,
    organizations: (counted.get(plan) ?? 0) + (plan === "FREE" ? withoutSubscription : 0),
  }));

  const revenue = new Map<Locale, RevenueLine>(
    LOCALES.map((locale) => [locale, { locale, amount: 0, accounts: 0 }]),
  );

  for (const subscription of paying) {
    const raw = subscription.organization.locale;
    const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
    const line = revenue.get(locale)!;

    line.amount += PLAN_PRICE[locale][subscription.plan];
    line.accounts += 1;
  }

  return {
    organizations,
    organizationsLast30Days,
    users,
    admins,
    tenantAccounts,
    properties,
    leases,
    tenants,
    invoicesLast30Days,
    plans,
    revenue: [...revenue.values()],
    billingExempt,
  };
}

export type SignupRow = {
  id: string;
  name: string;
  createdAt: Date;
  ownerEmail: string | null;
  locale: Locale;
};

/** Ostatnio założone konta — kto się rejestruje i czy w ogóle ktoś się rejestruje. */
export async function recentSignups(limit = 8): Promise<SignupRow[]> {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      createdAt: true,
      locale: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { user: { select: { email: true } } },
      },
    },
  });

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    ownerEmail: organization.members[0]?.user.email ?? null,
    locale: isLocale(organization.locale) ? organization.locale : DEFAULT_LOCALE,
  }));
}

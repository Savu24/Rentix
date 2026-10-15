import { notFound } from "next/navigation";

import { PlanLock } from "@/components/panel/plan-lock";
import { LogoForm } from "@/components/panel/settings/logo-form";
import { NumberingForm } from "@/components/panel/settings/numbering-form";
import { OrganizationForm } from "@/components/panel/settings/organization-form";
import { PlanCard, type PlanBilling } from "@/components/panel/settings/plan-card";
import { SettingsColumns } from "@/components/panel/settings/settings-columns";
import { Alert } from "@/components/ui/alert";
import { membershipRole, requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows, organizationPlan } from "@/lib/billing/server";
import { organizationRentFee, PAID_PLANS } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { invoiceNumberPrefixes } from "@/lib/invoices/numbering";
import {
  getOrganization,
  getOrganizationLogo,
  isSellerComplete,
} from "@/lib/organizations/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { prisma } from "@/lib/prisma";

export default async function SettingsOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ platnosc?: string; plan?: string }>;
}) {
  const session = await requireOwnerSession("/panel/ustawienia");
  const organizationId = session.user.organizationId;
  const [organization, logo, logoAllowed, plan, d, locale, subscription, role, query, rentFee] =
    await Promise.all([
      getOrganization(organizationId),
      getOrganizationLogo(organizationId),
      organizationAllows(organizationId, "DOCUMENT_LOGO"),
      organizationPlan(organizationId),
      panelDictionary(),
      panelLocale(),
      prisma.subscription.findUnique({
        where: { organizationId },
        select: { billingExempt: true, externalSubscriptionId: true, status: true },
      }),
      membershipRole(session.user.id, organizationId),
      searchParams,
      organizationRentFee(organizationId),
    ]);

  if (!organization) notFound();

  /*
    Zakup widzi tylko ten, kto może go zrobić: właściciel albo administrator
    organizacji, na koncie, które w ogóle jest obciążane. Pozostałym karta
    pokazuje sam plan — ten sam warunek pilnuje API, tu chodzi o to, żeby nie
    kusić przyciskiem, który skończy się odmową.
  */
  const billing: PlanBilling =
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !subscription?.billingExempt &&
    (role === "OWNER" || role === "ADMIN")
      ? {
          publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          subscribed:
            Boolean(subscription?.externalSubscriptionId) && subscription?.status !== "CANCELLED",
          pastDue: subscription?.status === "PAST_DUE",
          returned: Boolean(query.platnosc),
          // Plan wybrany w cenniku na stronie głównej (`planPurchasePath`).
          requestedPlan:
            (PAID_PLANS as readonly string[]).find((plan) => plan === query.plan) ?? null,
          rentFeeGrosze: rentFee,
        }
      : null;

  return (
    <SettingsColumns
      aside={
        <>
          <PlanCard usage={plan} billing={billing} />
          {logoAllowed ? (
            <LogoForm logo={logo?.dataUrl ?? null} />
          ) : (
            <PlanLock feature="DOCUMENT_LOGO" title={d.panel.settings.logo.locked.title} />
          )}
        </>
      }
    >
      {!isSellerComplete(organization) ? (
        <Alert tone="warning">{d.panel.settings.pages.sellerIncomplete}</Alert>
      ) : null}

      <OrganizationForm
        defaultValues={{
          name: organization.name,
          contactEmail: organization.contactEmail ?? "",
          taxId: organization.taxId ?? "",
          street: organization.street ?? "",
          postalCode: organization.postalCode ?? "",
          city: organization.city ?? "",
          bankAccount: organization.bankAccount ?? "",
        }}
      />

      <NumberingForm current={organization.invoiceNumberFormat} prefixes={invoiceNumberPrefixes(locale)} />
    </SettingsColumns>
  );
}

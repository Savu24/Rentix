import { notFound } from "next/navigation";

import { PlanLock } from "@/components/panel/plan-lock";
import { LogoForm } from "@/components/panel/settings/logo-form";
import { NumberingForm } from "@/components/panel/settings/numbering-form";
import { OrganizationForm } from "@/components/panel/settings/organization-form";
import { PlanCard } from "@/components/panel/settings/plan-card";
import { SettingsColumns } from "@/components/panel/settings/settings-columns";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { organizationAllows, organizationPlan } from "@/lib/billing/server";
import { invoiceNumberPrefixes } from "@/lib/invoices/numbering";
import {
  getOrganization,
  getOrganizationLogo,
  isSellerComplete,
} from "@/lib/organizations/service";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export default async function SettingsOrganizationPage() {
  const session = await requireOwnerSession("/panel/ustawienia");
  const [organization, logo, logoAllowed, plan, d, locale] = await Promise.all([
    getOrganization(session.user.organizationId),
    getOrganizationLogo(session.user.organizationId),
    organizationAllows(session.user.organizationId, "DOCUMENT_LOGO"),
    organizationPlan(session.user.organizationId),
    panelDictionary(),
    panelLocale(),
  ]);

  if (!organization) notFound();

  return (
    <SettingsColumns
      aside={
        <>
          <PlanCard usage={plan} />
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

import { notFound } from "next/navigation";

import { LogoForm } from "@/components/panel/settings/logo-form";
import { OrganizationForm } from "@/components/panel/settings/organization-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import {
  getOrganization,
  getOrganizationLogo,
  isSellerComplete,
} from "@/lib/organizations/service";

export default async function SettingsOrganizationPage() {
  const session = await requireOwnerSession("/panel/ustawienia");
  const [organization, logo] = await Promise.all([
    getOrganization(session.user.organizationId),
    getOrganizationLogo(session.user.organizationId),
  ]);

  if (!organization) notFound();

  return (
    <div className="flex flex-col gap-5">
      {!isSellerComplete(organization) ? (
        <Alert tone="warning">
          Uzupełnij adres wystawcy. Bez niego rachunki i umowy wychodzą z samą nazwą, a to
          dokumenty, które trafiają do najemcy i do księgowości.
        </Alert>
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

      <LogoForm logo={logo?.dataUrl ?? null} />
    </div>
  );
}

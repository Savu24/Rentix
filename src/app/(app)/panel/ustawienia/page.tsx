import { notFound } from "next/navigation";

import { OrganizationForm } from "@/components/panel/settings/organization-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { getOrganization, isSellerComplete } from "@/lib/organizations/service";

export default async function SettingsOrganizationPage() {
  const session = await requireOwnerSession("/panel/ustawienia");
  const organization = await getOrganization(session.user.organizationId);

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
        }}
      />
    </div>
  );
}

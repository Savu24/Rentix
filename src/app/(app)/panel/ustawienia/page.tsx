import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationForm } from "@/components/panel/settings/organization-form";
import { PasswordForm } from "@/components/panel/settings/password-form";
import { ProfileForm } from "@/components/panel/settings/profile-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { getOrganization, isSellerComplete } from "@/lib/organizations/service";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const session = await requireOwnerSession("/panel/ustawienia");

  const [organization, user] = await Promise.all([
    getOrganization(session.user.organizationId),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, phone: true, passwordHash: true },
    }),
  ]);

  if (!organization || !user) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="r-display text-[26px] leading-tight text-fg">Ustawienia</h1>
        <p className="text-sm text-muted">Dane wystawcy dokumentów i Twoje konto.</p>
      </div>

      {!isSellerComplete(organization) ? (
        <Alert tone="warning">
          Uzupełnij adres wystawcy. Bez niego rachunki i umowy wychodzą z samą nazwą, a to
          dokumenty, które trafiają do najemcy i do księgowości.
        </Alert>
      ) : null}

      <Alert tone="info">
        Twoja strona ofert:{" "}
        <a
          href={`/o/${organization.slug}`}
          target="_blank"
          rel="noopener"
          className="font-medium underline"
        >
          /o/{organization.slug}
        </a>{" "}
        — trafiają na nią nieruchomości oznaczone jako publiczne.
      </Alert>

      <OrganizationForm
        defaultValues={{
          name: organization.name,
          taxId: organization.taxId ?? "",
          street: organization.street ?? "",
          postalCode: organization.postalCode ?? "",
          city: organization.city ?? "",
        }}
      />

      <ProfileForm
        email={user.email}
        defaultValues={{ name: user.name ?? "", phone: user.phone ?? "" }}
      />

      {/* Konto bez hasła loguje się przez zewnętrznego dostawcę — formularz
          zmiany hasła nie miałby czego zmieniać. */}
      {user.passwordHash ? <PasswordForm /> : null}
    </div>
  );
}

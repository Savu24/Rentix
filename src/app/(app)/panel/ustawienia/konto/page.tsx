import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteAccount } from "@/components/panel/settings/delete-account";
import { PasswordForm } from "@/components/panel/settings/password-form";
import { ProfileForm } from "@/components/panel/settings/profile-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { accountDeletionSummary } from "@/lib/organizations/service";
import { prisma } from "@/lib/prisma";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.settings.pages.account };
}

export default async function SettingsAccountPage() {
  const session = await requireOwnerSession("/panel/ustawienia/konto");

  const [user, deletion] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, phone: true, passwordHash: true },
    }),
    accountDeletionSummary(session.user.organizationId),
  ]);

  if (!user) notFound();

  return (
    <div className="flex flex-col gap-5">
      <ProfileForm
        email={user.email}
        defaultValues={{ name: user.name ?? "", phone: user.phone ?? "" }}
      />

      {/* Konto bez hasła loguje się przez zewnętrznego dostawcę — formularz
          zmiany hasła nie miałby czego zmieniać. */}
      {user.passwordHash ? <PasswordForm /> : null}

      {/* Usunięcie konta na końcu strony: nie sąsiaduje z żadnym „Zapisz". */}
      {user.passwordHash && deletion ? <DeleteAccount summary={deletion} /> : null}
    </div>
  );
}

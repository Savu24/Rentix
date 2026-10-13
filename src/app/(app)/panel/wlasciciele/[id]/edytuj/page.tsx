import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormPage } from "@/components/panel/form-page";
import { OwnerForm } from "@/components/panel/owners/owner-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { getOwner } from "@/lib/owners/service";

type Params = { params: Promise<{ id: string }> };

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.editTitle };
}

export default async function EditOwnerPage({ params }: Params) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const owner = await getOwner(session.user.organizationId, id);
  if (!owner) notFound();

  return (
    <FormPage
      back={{ href: `/panel/wlasciciele/${owner.id}`, label: owner.name }}
      title={(await panelDictionary()).panel.ownersPage.editTitle}
    >
      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          name: owner.name,
          taxId: owner.taxId ?? "",
          email: owner.email ?? "",
          phone: owner.phone ?? "",
          street: owner.street ?? "",
          postalCode: owner.postalCode ?? "",
          city: owner.city ?? "",
          bankAccount: owner.bankAccount ?? "",
          // Daty leżą w bazie jako północ UTC, więc `slice` daje ten sam dzień,
          // który wpisano — bez przesunięcia o strefę.
          contractStartDate: owner.contractStartDate?.toISOString().slice(0, 10) ?? "",
          contractEndDate: owner.contractEndDate?.toISOString().slice(0, 10) ?? "",
          notes: owner.notes ?? "",
        }}
      />
    </FormPage>
  );
}

import type { Metadata } from "next";

import { FormPage } from "@/components/panel/form-page";
import { OwnerForm } from "@/components/panel/owners/owner-form";
import { requireOwnerSession } from "@/lib/auth/session";

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.newTitle };
}

export default async function NewOwnerPage() {
  const t = (await panelDictionary()).panel.ownersPage;
  await requireOwnerSession("/panel/wlasciciele/nowy");

  return (
    <FormPage back={{ href: "/panel/wlasciciele", label: t.title }} title={t.newTitle}>
      <OwnerForm />
    </FormPage>
  );
}

import type { Metadata } from "next";

import { FormPage } from "@/components/panel/form-page";
import { PropertyForm } from "@/components/panel/properties/property-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwnersForPicker } from "@/lib/owners/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.propertiesPage.newTitle };
}

export default async function NewPropertyPage() {
  const session = await requireOwnerSession("/panel/nieruchomosci/nowa");
  const owners = await listOwnersForPicker(session.user.organizationId);
  const d = await panelDictionary();
  const t = d.panel.propertiesPage;

  return (
    <FormPage
      back={{ href: "/panel/nieruchomosci", label: t.title }}
      title={t.newTitle}
      steps={{ label: d.panel.panelMisc.steps, items: d.panel.panelMisc.propertySteps, active: 0 }}
    >
      <PropertyForm owners={owners} />
    </FormPage>
  );
}

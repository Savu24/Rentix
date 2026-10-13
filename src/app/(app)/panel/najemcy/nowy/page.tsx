import type { Metadata } from "next";

import { FormPage } from "@/components/panel/form-page";
import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.newTitle };
}

export default async function NewTenantPage() {
  await requireOwnerSession("/panel/najemcy/nowy");
  const d = await panelDictionary();
  const t = d.panel.tenantsPage;

  return (
    <FormPage
      back={{ href: "/panel/najemcy", label: t.title }}
      title={t.newTitle}
      steps={{ label: d.panel.panelMisc.next, items: d.panel.panelMisc.tenantSteps, active: 0 }}
    >
      <TenantForm />
    </FormPage>
  );
}

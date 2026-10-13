import type { Metadata } from "next";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { PageHeader } from "@/components/panel/page-header";
import { requireOwnerSession } from "@/lib/auth/session";
import { listTenants } from "@/lib/tenants/service";

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.archiveTitle };
}

export default async function ArchivedTenantsPage() {
  const session = await requireOwnerSession("/panel/najemcy/archiwum");
  const t = (await panelDictionary()).panel.tenantsPage;

  const tenants = await listTenants(session.user.organizationId, {
    includeArchived: true,
    overdue: false,
    sort: "name",
  });

  const archived = tenants.filter((tenant) => tenant.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={{ href: "/panel/najemcy", label: t.title }} title={t.archiveTitle} />

      <ArchiveList
        columnLabel={t.table.tenant}
        endpoint="/api/tenants"
        nouns={t.noun}
        items={archived.map((tenant) => ({
          id: tenant.id,
          title: `${tenant.firstName} ${tenant.lastName}`,
          subtitle: tenant.email ?? tenant.phone ?? null,
          archivedAt: tenant.archivedAt,
        }))}
      />
    </div>
  );
}

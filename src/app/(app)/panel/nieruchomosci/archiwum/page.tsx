import type { Metadata } from "next";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { PageHeader } from "@/components/panel/page-header";
import { requireOwnerSession } from "@/lib/auth/session";
import { panelDictionary } from "@/lib/panel/dictionary";
import { formatPropertyAddress } from "@/lib/properties/address";
import { listProperties } from "@/lib/properties/service";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.propertiesPage.archiveTitle };
}

export default async function ArchivedPropertiesPage() {
  const session = await requireOwnerSession("/panel/nieruchomosci/archiwum");
  const d = await panelDictionary();
  const t = d.panel.propertiesPage;

  const properties = await listProperties(session.user.organizationId, {
    includeArchived: true,
    occupancy: "all",
  });

  const archived = properties.filter((property) => property.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={{ href: "/panel/nieruchomosci", label: t.title }} title={t.archiveTitle} />

      <ArchiveList
        columnLabel={t.table.property}
        endpoint="/api/properties"
        nouns={t.noun}
        items={archived.map((property) => ({
          id: property.id,
          title: property.name,
          subtitle: formatPropertyAddress(property),
          archivedAt: property.archivedAt,
        }))}
      />
    </div>
  );
}

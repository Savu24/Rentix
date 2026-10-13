import type { Metadata } from "next";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { PageHeader } from "@/components/panel/page-header";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwners } from "@/lib/owners/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.archiveTitle };
}

export default async function ArchivedOwnersPage() {
  const session = await requireOwnerSession("/panel/wlasciciele/archiwum");
  const t = (await panelDictionary()).panel.ownersPage;

  const owners = await listOwners(session.user.organizationId, { includeArchived: true });
  const archived = owners.filter((owner) => owner.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={{ href: "/panel/wlasciciele", label: t.title }} title={t.archiveTitle} />

      <ArchiveList
        columnLabel={t.table.owner}
        endpoint="/api/owners"
        nouns={t.noun}
        items={archived.map((owner) => ({
          id: owner.id,
          title: owner.name,
          subtitle: owner.city ?? owner.email ?? null,
          archivedAt: owner.archivedAt,
        }))}
      />
    </div>
  );
}

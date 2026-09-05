import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveList } from "@/components/panel/archive/archive-list";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/nieruchomosci"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>
        <div>
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.archiveTitle}</h1>
          <p className="mt-1 text-sm text-muted">{d.panel.archive.lead}</p>
        </div>
      </div>

      <ArchiveList
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

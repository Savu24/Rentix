import type { Metadata } from "next";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { PageHeader } from "@/components/panel/page-header";
import { requireOwnerSession } from "@/lib/auth/session";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { listLeases } from "@/lib/leases/service";
import { leaseStatusLabels } from "@/lib/validations/lease";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.leasesPage.archiveTitle };
}

export default async function ArchivedLeasesPage() {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.leasesPage;
  const session = await requireOwnerSession("/panel/umowy/archiwum");

  const leases = await listLeases(session.user.organizationId, { includeArchived: true });
  const archived = leases.filter((lease) => lease.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={{ href: "/panel/umowy", label: t.title }} title={t.archiveTitle} />

      <ArchiveList
        columnLabel={t.table.unit}
        endpoint="/api/leases"
        nouns={t.noun}
        items={archived.map((lease) => ({
          id: lease.id,
          title: `${lease.property.name}${lease.room ? ` · ${lease.room.name}` : ""}${
            lease.number ? fill(t.archiveItemNumber, { number: lease.number }) : ""
          }`,
          subtitle: `${fill(t.archiveItemFrom, {
            status: leaseStatusLabels(d)[lease.status],
            date: formatDateIn(lease.startDate, locale, "short"),
          })}${
            lease.tenants[0]
              ? ` · ${lease.tenants[0].tenant.firstName} ${lease.tenants[0].tenant.lastName}`
              : ""
          }`,
          archivedAt: lease.archivedAt,
        }))}
      />
    </div>
  );
}

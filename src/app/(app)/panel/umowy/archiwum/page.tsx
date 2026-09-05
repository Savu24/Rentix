import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveList } from "@/components/panel/archive/archive-list";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/umowy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>
        <div>
          <h1 className="r-display text-[26px] leading-tight text-fg">{t.archiveTitle}</h1>
          <p className="mt-1 text-sm text-muted">{t.archiveNote}</p>
        </div>
      </div>

      <ArchiveList
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

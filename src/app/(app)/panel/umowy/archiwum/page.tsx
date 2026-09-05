import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { requireOwnerSession } from "@/lib/auth/session";
import { listLeases } from "@/lib/leases/service";
import { leaseStatusLabels } from "@/lib/validations/lease";
import { panelDictionary } from "@/lib/panel/dictionary";
export const metadata: Metadata = { title: "Archiwum umów" };

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function ArchivedLeasesPage() {
  const d = await panelDictionary();
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
          Umowy
        </Link>
        <div>
          <h1 className="r-display text-[26px] leading-tight text-fg">Archiwum umów</h1>
          <p className="mt-1 text-sm text-muted">
            Umowy z wystawionymi dokumentami nie da się usunąć trwale. Faktury i wpłaty
            zostają, bo to historia rozliczeń.
          </p>
        </div>
      </div>

      <ArchiveList
        endpoint="/api/leases"
        nouns={["umowę", "umowy", "umów"]}
        items={archived.map((lease) => ({
          id: lease.id,
          title: `${lease.property.name}${lease.room ? ` · ${lease.room.name}` : ""}${
            lease.number ? `, nr ${lease.number}` : ""
          }`,
          subtitle: `${leaseStatusLabels(d)[lease.status]} · od ${dateFormat.format(
            lease.startDate,
          )}${
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

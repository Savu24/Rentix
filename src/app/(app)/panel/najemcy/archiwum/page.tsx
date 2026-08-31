import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { requireOwnerSession } from "@/lib/auth/session";
import { listTenants } from "@/lib/tenants/service";

export const metadata: Metadata = { title: "Archiwum najemców" };

export default async function ArchivedTenantsPage() {
  const session = await requireOwnerSession("/panel/najemcy/archiwum");

  const tenants = await listTenants(session.user.organizationId, {
    includeArchived: true,
    overdue: false,
    sort: "name",
  });

  const archived = tenants.filter((tenant) => tenant.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/najemcy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Najemcy
        </Link>
        <div>
          <h1 className="r-display text-[26px] leading-tight text-fg">Archiwum najemców</h1>
          <p className="mt-1 text-sm text-muted">
            Najemca z historią umów nie da się usunąć trwale — jego dane widnieją na
            wystawionych dokumentach.
          </p>
        </div>
      </div>

      <ArchiveList
        endpoint="/api/tenants"
        nouns={["najemcę", "najemców", "najemców"]}
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

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveList } from "@/components/panel/archive/archive-list";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwners } from "@/lib/owners/service";

export const metadata: Metadata = { title: "Archiwum właścicieli" };

export default async function ArchivedOwnersPage() {
  const session = await requireOwnerSession("/panel/wlasciciele/archiwum");

  const owners = await listOwners(session.user.organizationId, { includeArchived: true });
  const archived = owners.filter((owner) => owner.archivedAt !== null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/wlasciciele"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Właściciele
        </Link>
        <div>
          <h1 className="r-display text-[26px] leading-tight text-fg">Archiwum właścicieli</h1>
          <p className="mt-1 text-sm text-muted">
            Właściciel z przypisanymi nieruchomościami nie da się usunąć trwale — odepnij je
            najpierw.
          </p>
        </div>
      </div>

      <ArchiveList
        endpoint="/api/owners"
        nouns={["właściciela", "właścicieli", "właścicieli"]}
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

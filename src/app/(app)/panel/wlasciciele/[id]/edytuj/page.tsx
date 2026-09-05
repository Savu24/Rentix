import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OwnerForm } from "@/components/panel/owners/owner-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { getOwner } from "@/lib/owners/service";

type Params = { params: Promise<{ id: string }> };

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.editTitle };
}

export default async function EditOwnerPage({ params }: Params) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const owner = await getOwner(session.user.organizationId, id);
  if (!owner) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={`/panel/wlasciciele/${owner.id}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {owner.name}
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">
          {(await panelDictionary()).panel.ownersPage.editTitle}
        </h1>
      </div>

      <OwnerForm
        ownerId={owner.id}
        defaultValues={{
          name: owner.name,
          taxId: owner.taxId ?? "",
          email: owner.email ?? "",
          phone: owner.phone ?? "",
          street: owner.street ?? "",
          postalCode: owner.postalCode ?? "",
          city: owner.city ?? "",
          bankAccount: owner.bankAccount ?? "",
          // Daty leżą w bazie jako północ UTC, więc `slice` daje ten sam dzień,
          // który wpisano — bez przesunięcia o strefę.
          contractStartDate: owner.contractStartDate?.toISOString().slice(0, 10) ?? "",
          contractEndDate: owner.contractEndDate?.toISOString().slice(0, 10) ?? "",
          notes: owner.notes ?? "",
        }}
      />
    </div>
  );
}

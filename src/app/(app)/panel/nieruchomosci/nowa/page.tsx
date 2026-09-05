import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PropertyForm } from "@/components/panel/properties/property-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwnersForPicker } from "@/lib/owners/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.propertiesPage.newTitle };
}

export default async function NewPropertyPage() {
  const session = await requireOwnerSession("/panel/nieruchomosci/nowa");
  const owners = await listOwnersForPicker(session.user.organizationId);
  const t = (await panelDictionary()).panel.propertiesPage;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/nieruchomosci"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>

        <h1 className="r-display text-[26px] leading-tight text-fg">{t.newTitle}</h1>
        <p className="text-sm text-muted">{t.newLead}</p>
      </div>

      <PropertyForm owners={owners} />
    </div>
  );
}

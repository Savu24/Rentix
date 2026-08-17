import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PropertyForm } from "@/components/panel/properties/property-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { listOwnersForPicker } from "@/lib/owners/service";

export const metadata: Metadata = { title: "Nowa nieruchomość" };

export default async function NewPropertyPage() {
  const session = await requireOwnerSession("/panel/nieruchomosci/nowa");
  const owners = await listOwnersForPicker(session.user.organizationId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/nieruchomosci"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Nieruchomości
        </Link>

        <h1 className="r-display text-[26px] leading-tight text-fg">Nowa nieruchomość</h1>
        <p className="text-sm text-muted">
          Dodaj obiekt, a w kolejnym kroku jednostki najmu.
        </p>
      </div>

      <PropertyForm owners={owners} />
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { requireOwnerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nowy najemca" };

export default async function NewTenantPage() {
  await requireOwnerSession("/panel/najemcy/nowy");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/najemcy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Najemcy
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">Nowy najemca</h1>
        <p className="text-sm text-muted">
          Wystarczy imię i nazwisko. Resztę uzupełnisz przy podpisywaniu umowy.
        </p>
      </div>

      <TenantForm />
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OwnerForm } from "@/components/panel/owners/owner-form";
import { requireOwnerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nowy właściciel" };

export default async function NewOwnerPage() {
  await requireOwnerSession("/panel/wlasciciele/nowy");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/wlasciciele"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Właściciele
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">Nowy właściciel</h1>
      </div>

      <OwnerForm />
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OwnerForm } from "@/components/panel/owners/owner-form";
import { requireOwnerSession } from "@/lib/auth/session";

import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.ownersPage.newTitle };
}

export default async function NewOwnerPage() {
  const t = (await panelDictionary()).panel.ownersPage;
  await requireOwnerSession("/panel/wlasciciele/nowy");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/wlasciciele"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">{t.newTitle}</h1>
      </div>

      <OwnerForm />
    </div>
  );
}

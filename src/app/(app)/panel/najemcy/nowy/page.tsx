import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.tenantsPage.newTitle };
}

export default async function NewTenantPage() {
  await requireOwnerSession("/panel/najemcy/nowy");
  const t = (await panelDictionary()).panel.tenantsPage;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/najemcy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">{t.newTitle}</h1>
        <p className="text-sm text-muted">{t.newLead}</p>
      </div>

      <TenantForm />
    </div>
  );
}

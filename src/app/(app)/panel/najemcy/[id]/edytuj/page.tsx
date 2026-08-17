import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TenantForm } from "@/components/panel/tenants/tenant-form";
import { requireOwnerSession } from "@/lib/auth/session";
import { getTenant } from "@/lib/tenants/service";

export const metadata: Metadata = { title: "Edycja najemcy" };

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const tenant = await getTenant(session.user.organizationId, id);
  if (!tenant) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href={`/panel/najemcy/${tenant.id}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tenant.firstName} {tenant.lastName}
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">Edycja najemcy</h1>
      </div>

      <TenantForm
        tenantId={tenant.id}
        defaultValues={{
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          status: tenant.status,
          email: tenant.email ?? "",
          phone: tenant.phone ?? "",
          street: tenant.street ?? "",
          postalCode: tenant.postalCode ?? "",
          city: tenant.city ?? "",
          taxId: tenant.taxId ?? "",
          notes: tenant.notes ?? "",
        }}
      />
    </div>
  );
}

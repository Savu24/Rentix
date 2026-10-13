import { Building2, FileText, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LeaseForm } from "@/components/panel/leases/lease-form";
import { PageHeader } from "@/components/panel/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwnerSession } from "@/lib/auth/session";
import { listPropertiesForPicker } from "@/lib/leases/service";
import { fill } from "@/lib/i18n/format";
import { panelDictionary } from "@/lib/panel/dictionary";
import { tenantPropertyIds } from "@/lib/tenants/address-match";
import { listTenantsForPicker } from "@/lib/tenants/service";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.leasesPage.add };
}

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; roomId?: string; tenantId?: string }>;
}) {
  const session = await requireOwnerSession("/panel/umowy/nowa");
  const organizationId = session.user.organizationId;
  // Prefill z przycisku „Przypisz” przy pokoju. Identyfikatory są tylko
  // podpowiedzią dla formularza — API i tak sprawdza, czy należą do organizacji.
  const preset = await searchParams;

  const [properties, tenantRows, dictionary] = await Promise.all([
    listPropertiesForPicker(organizationId),
    listTenantsForPicker(organizationId),
    panelDictionary(),
  ]);

  // Dopasowanie do adresów liczy serwer: formularz dostaje gotową listę
  // nieruchomości przy każdym najemcy, a nie adresy do porównywania.
  const addresses = properties.map(({ id, address }) => ({ id, ...address }));
  const tenants = tenantRows.map(({ leases, ...tenant }) => ({
    ...tenant,
    propertyIds: tenantPropertyIds(
      { ...tenant, leasePropertyIds: leases.map((entry) => entry.lease.propertyId) },
      addresses,
    ),
  }));
  const t = dictionary.panel.leasesPage;

  const missing: string[] = [];
  if (properties.length === 0) missing.push(t.missingProperty);
  if (tenants.length === 0) missing.push(t.missingTenant);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader back={{ href: "/panel/umowy", label: t.title }} title={t.newTitle} />

      {missing.length > 0 ? (
        <EmptyState
          icon={FileText}
          title={fill(t.missingPrefix, { what: missing.join(t.missingJoin) })}
          action={
            <>
              {properties.length === 0 ? (
                <Button asChild>
                  <Link href="/panel/nieruchomosci/nowa">
                    <Building2 className="size-[18px]" aria-hidden />
                    {t.needProperty}
                  </Link>
                </Button>
              ) : null}
              {tenants.length === 0 ? (
                <Button asChild variant={properties.length === 0 ? "secondary" : "primary"}>
                  <Link href="/panel/najemcy/nowy">
                    <UserPlus className="size-[18px]" aria-hidden />
                    {t.needTenant}
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />
      ) : (
        <LeaseForm properties={properties} tenants={tenants} preset={preset} />
      )}
    </div>
  );
}

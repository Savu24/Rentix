import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LeaseForm } from "@/components/panel/leases/lease-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { listPropertiesForPicker } from "@/lib/leases/service";
import { fill } from "@/lib/i18n/format";
import { panelDictionary } from "@/lib/panel/dictionary";
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

  const [properties, tenants, dictionary] = await Promise.all([
    listPropertiesForPicker(organizationId),
    listTenantsForPicker(organizationId),
    panelDictionary(),
  ]);
  const t = dictionary.panel.leasesPage;

  const missing: string[] = [];
  if (properties.length === 0) missing.push(t.missingProperty);
  if (tenants.length === 0) missing.push(t.missingTenant);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/umowy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">{t.newTitle}</h1>
        {/* Wersja, która nie wystawia umowy PDF, mówi o warunkach najmu —
            obiecywanie dokumentu, którego nie ma, byłoby kłamstwem. */}
        <p className="text-sm text-muted">{t.newLead || t.newLeadNoDocument}</p>
      </div>

      {missing.length > 0 ? (
        <Alert tone="warning">
          {fill(t.missingPrefix, { what: missing.join(t.missingJoin) })}{" "}
          {properties.length === 0 ? (
            <Link href="/panel/nieruchomosci/nowa" className="font-medium underline">
              {t.needProperty}
            </Link>
          ) : (
            <Link href="/panel/najemcy/nowy" className="font-medium underline">
              {t.needTenant}
            </Link>
          )}
        </Alert>
      ) : (
        <LeaseForm properties={properties} tenants={tenants} preset={preset} />
      )}
    </div>
  );
}

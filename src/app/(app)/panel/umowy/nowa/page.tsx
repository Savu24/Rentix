import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LeaseForm } from "@/components/panel/leases/lease-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { listPropertiesForPicker } from "@/lib/leases/service";
import { listTenantsForPicker } from "@/lib/tenants/service";

export const metadata: Metadata = { title: "Nowa umowa" };

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

  const [properties, tenants] = await Promise.all([
    listPropertiesForPicker(organizationId),
    listTenantsForPicker(organizationId),
  ]);

  const missing: string[] = [];
  if (properties.length === 0) missing.push("nieruchomość");
  if (tenants.length === 0) missing.push("najemcę");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/umowy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Umowy
        </Link>
        <h1 className="r-display text-[26px] leading-tight text-fg">Nowa umowa najmu</h1>
        <p className="text-sm text-muted">
          Po zapisaniu wygenerujesz gotowy PDF do podpisu.
        </p>
      </div>

      {missing.length > 0 ? (
        <Alert tone="warning">
          Zanim utworzysz umowę, dodaj {missing.join(" i ")}.{" "}
          {properties.length === 0 ? (
            <Link href="/panel/nieruchomosci/nowa" className="font-medium underline">
              Dodaj nieruchomość
            </Link>
          ) : (
            <Link href="/panel/najemcy/nowy" className="font-medium underline">
              Dodaj najemcę
            </Link>
          )}
        </Alert>
      ) : (
        <LeaseForm properties={properties} tenants={tenants} preset={preset} />
      )}
    </div>
  );
}

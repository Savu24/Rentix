import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaseEditForm } from "@/components/panel/leases/lease-edit-form";
import { Alert } from "@/components/ui/alert";
import { requireOwnerSession } from "@/lib/auth/session";
import { getLease } from "@/lib/leases/service";
import { formatAmount } from "@/lib/money";
import { LEASE_SETTABLE_STATUSES } from "@/lib/validations/lease";
import { fill } from "@/lib/i18n/format";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.panelMisc.leaseEditTitle };
}

const toInputDate = (date: Date | null | undefined) =>
  date ? date.toISOString().slice(0, 10) : "";

export default async function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const lease = await getLease(session.user.organizationId, id);
  if (!lease) notFound();

  const d = await panelDictionary();
  const title = lease.number
    ? fill(d.panel.leasesPage.detail.numbered, { number: lease.number })
    : d.panel.leasesPage.detail.untitled;

  const settableStatus = LEASE_SETTABLE_STATUSES.find((value) => value === lease.status);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href={`/panel/umowy/${lease.id}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {title}
        </Link>

        <h1 className="r-display text-[26px] leading-tight text-fg">
          {d.panel.panelMisc.leaseEditTitle}
        </h1>
        <p className="text-sm text-muted">
          {lease.property.name}
          {lease.room ? ` · ${lease.room.name}` : ""} ·{" "}
          {lease.tenants.map(({ tenant }) => `${tenant.firstName} ${tenant.lastName}`).join(", ")}
        </p>
      </div>

      {/* Mówimy wprost, czego tu nie ma, zamiast zostawiać użytkownika
          z szukaniem pola, którego nie znajdzie. */}
      <Alert tone="info">
        {d.panel.panelMisc.leaseEditLead} {d.panel.panelMisc.leaseEditElsewhere}
      </Alert>

      <LeaseEditForm
        leaseId={lease.id}
        defaultValues={{
          number: lease.number ?? "",
          // Umowa wypowiedziana albo wygasła nie dostaje selecta: przestawienie
          // jej z powrotem na aktywną wymaga decyzji o lokalu, a nie wyboru
          // z listy. Brak wartości = formularz nie rusza statusu.
          status: settableStatus,
          startDate: toInputDate(lease.startDate),
          endDate: toInputDate(lease.endDate),
          rentGrosze: formatAmount(lease.rentGrosze),
          depositGrosze: lease.depositGrosze ? formatAmount(lease.depositGrosze) : "",
          utilitiesMode: lease.utilitiesMode,
          utilitiesAdvanceGrosze: lease.utilitiesAdvanceGrosze
            ? formatAmount(lease.utilitiesAdvanceGrosze)
            : "",
          billingDay: lease.billingDay,
          billingStartsAt: toInputDate(lease.billingStartsAt),
          paymentTermDays: lease.paymentTermDays,
          sendInvoicesByEmail: lease.sendInvoicesByEmail,
          notes: lease.notes ?? "",
        }}
      />
    </div>
  );
}

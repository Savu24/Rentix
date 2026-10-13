import { Building2, Lock, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeaseEditForm } from "@/components/panel/leases/lease-edit-form";
import { PageHeader } from "@/components/panel/page-header";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        back={{ href: `/panel/umowy/${lease.id}`, label: title }}
        title={d.panel.panelMisc.leaseEditTitle}
      />

      <LeaseEditForm
        leaseId={lease.id}
        /* Lokal i najemców zmienia się nową umową, nie edycją tej — karta
           pokazuje je z kłódką zamiast zdania, czego tu nie ma. */
        subject={
          <section className="flex items-start gap-3 rounded-tile border border-border bg-surface-alt p-4 lg:rounded-card lg:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex items-center gap-2.5 text-[14.5px] font-semibold text-fg">
                <Building2 className="size-[18px] shrink-0 text-subtle" aria-hidden />
                {lease.property.name}
                {lease.room ? `, ${lease.room.name}` : ""}
              </span>
              <span className="flex items-center gap-2.5 text-sm text-muted">
                <Users className="size-[18px] shrink-0 text-subtle" aria-hidden />
                {lease.tenants.map(({ tenant }) => `${tenant.firstName} ${tenant.lastName}`).join(", ")}
              </span>
            </div>
            <Lock className="size-[18px] shrink-0 text-subtle" aria-label={d.panel.panelMisc.leaseEditElsewhere} />
          </section>
        }
        defaultValues={{
          number: lease.number ?? "",
          // Umowa wypowiedziana albo wygasła nie dostaje selecta: przestawienie
          // jej z powrotem na aktywną wymaga decyzji o lokalu, a nie wyboru
          // z listy. Brak wartości = formularz nie rusza statusu.
          status: settableStatus,
          startDate: toInputDate(lease.startDate),
          endDate: toInputDate(lease.endDate),
          // Puste pole = terminy ustawowe; zero byłoby ustaleniem stron.
          noticePeriodMonths: lease.noticePeriodMonths ?? "",
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

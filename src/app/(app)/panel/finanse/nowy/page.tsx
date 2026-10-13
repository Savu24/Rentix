import type { Metadata } from "next";

import { ManualInvoiceForm } from "@/components/panel/invoices/manual-invoice-form";
import { PageHeader } from "@/components/panel/page-header";
import { requireOwnerSession } from "@/lib/auth/session";
import { listManualInvoiceRecipients } from "@/lib/invoices/service";
import { panelDictionary } from "@/lib/panel/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await panelDictionary()).panel.financePage.manualInvoice.title };
}

/**
 * Ręczne wystawienie dokumentu (redesign/15-wystaw-recznie.svg).
 *
 * Wchodzi się tu z Finansów albo z karty najemcy (`?najemca=`) — wtedy
 * najemca jest już wybrany, a „Wróć" i „Anuluj" prowadzą z powrotem do karty.
 */
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOwnerSession("/panel/finanse/nowy");
  const d = await panelDictionary();
  const params = await searchParams;
  const requested = typeof params.najemca === "string" ? params.najemca : undefined;

  const recipients = await listManualInvoiceRecipients(session.user.organizationId, requested);
  // Najemca spoza organizacji nie trafi na listę, więc nie zostanie też wybrany.
  const tenant = recipients.find((recipient) => recipient.id === requested) ?? null;

  const back = tenant
    ? { href: `/panel/najemcy/${tenant.id}`, label: tenant.name }
    : { href: "/panel/finanse", label: d.panel.financePage.title };

  return (
    <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
      <PageHeader back={back} title={d.panel.financePage.manualInvoice.title} />
      <ManualInvoiceForm recipients={recipients} initialTenantId={tenant?.id ?? null} cancelHref={back.href} />
    </div>
  );
}

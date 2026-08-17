import { ArrowLeft, DoorOpen, FileText, Mail, MessageSquare, Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { INVOICE_STATUS_META, remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { formatPLN } from "@/lib/money";
import { getTenant } from "@/lib/tenants/service";
import { LEASE_STATUS_LABEL, LEASE_STATUS_TONE } from "@/lib/validations/lease";
import { TENANT_STATUS_LABEL, TENANT_STATUS_TONE } from "@/lib/validations/tenant";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const tenant = await getTenant(session.user.organizationId, id);

  return { title: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Najemca" };
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function TenantDetailPage({ params }: Params) {
  const session = await requireOwnerSession();
  const { id } = await params;

  const tenant = await getTenant(session.user.organizationId, id);
  if (!tenant) notFound();

  const leases = tenant.leases.map((entry) => entry.lease);
  const invoices = leases.flatMap((lease) => lease.invoices);
  const payments = invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.number })),
  );

  const now = new Date();
  const outstanding = invoices
    .filter((invoice) => ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status))
    .reduce((total, invoice) => total + remainingGrosze(invoice), 0);
  const totalPaid = payments.reduce((total, payment) => total + payment.amountGrosze, 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/najemcy"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Najemcy
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">
                {tenant.firstName} {tenant.lastName}
              </h1>
              <Badge tone={TENANT_STATUS_TONE[tenant.status]}>
                {TENANT_STATUS_LABEL[tenant.status]}
              </Badge>
            </div>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {tenant.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {tenant.email}
                </span>
              ) : null}
              {tenant.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {tenant.phone}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/najemcy/${tenant.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edytuj
              </Link>
            </Button>

            {/* Przypisanie idzie przez kreator umowy z wypełnionym najemcą —
                nie dublujemy mechanizmu, bo o tym, kto gdzie mieszka,
                rozstrzyga umowa. */}
            <Button asChild size="sm">
              <Link href={`/panel/umowy/nowa?tenantId=${tenant.id}`}>
                <DoorOpen className="h-4 w-4" aria-hidden />
                Przypisz do mieszkania
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label="Do zapłaty" value={formatPLN(outstanding)} tone={outstanding > 0 ? "bad" : "good"} />
        <SummaryTile label="Wpłacono łącznie" value={formatPLN(totalPaid)} />
        <SummaryTile label="Umowy" value={String(leases.length)} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-fg">Umowy</h2>
        {leases.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              Ten najemca nie ma jeszcze żadnej umowy.{" "}
              <Link href="/panel/umowy/nowa" className="font-medium text-accent hover:underline">
                Utwórz umowę
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          leases.map((lease) => (
            <Card key={lease.id} className="transition-colors hover:border-muted">
              <Link href={`/panel/umowy/${lease.id}`} className="block rounded-card">
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-fg">
                        {lease.property.name}
                        {lease.room ? ` · ${lease.room.name}` : ""}
                      </p>
                      <Badge tone={LEASE_STATUS_TONE[lease.status]}>
                        {LEASE_STATUS_LABEL[lease.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {dateFormat.format(lease.startDate)} –{" "}
                      {lease.endDate ? dateFormat.format(lease.endDate) : "czas nieokreślony"}
                      {lease.number ? ` · nr ${lease.number}` : ""}
                    </p>
                  </div>
                  <p className="tabular font-mono text-sm font-medium text-fg">
                    {formatPLN(lease.rentGrosze)}/mies.
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-fg">Rozliczenia</h2>
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">Brak wystawionych faktur.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {invoices.slice(0, 12).map((invoice, index) => {
                const status = resolveInvoiceStatus(invoice, now);
                const meta = INVOICE_STATUS_META[status];

                return (
                  <div
                    key={invoice.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${
                      index > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{invoice.number}</p>
                      <p className="text-xs text-muted">
                        termin {dateFormat.format(invoice.dueDate)}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <p className="tabular w-24 text-right font-mono text-sm text-fg">
                      {formatPLN(invoice.totalGrossGrosze)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
          Komunikacja
        </h2>
        {tenant.messageThreads.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              Brak wątków rozmów z tym najemcą.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {tenant.messageThreads.map((thread, index) => (
                <div
                  key={thread.id}
                  className={`px-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-fg">
                      {thread.subject ?? "Wątek bez tematu"}
                    </p>
                    <p className="shrink-0 text-xs text-muted">
                      {dateFormat.format(thread.lastMessageAt)}
                    </p>
                  </div>
                  {thread.messages[0] ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {thread.messages[0].body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    {thread._count.messages}{" "}
                    {thread._count.messages === 1 ? "wiadomość" : "wiadomości"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {tenant.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
              <FileText className="h-3.5 w-3.5 text-muted" aria-hidden />
              Notatki wewnętrzne
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{tenant.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color = tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-fg";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted">{label}</p>
        <p className={`tabular font-mono text-[19px] font-medium ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

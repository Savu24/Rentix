import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarClock,
  DoorOpen,
  FileText,
  Home,
  IdCard,
  Mail,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { GenerateInvoices } from "@/components/panel/invoices/generate-invoices";
import { ManualInvoiceForm } from "@/components/panel/invoices/manual-invoice-form";
import { INVOICE_STATUS_META, remainingGrosze, resolveInvoiceStatus } from "@/lib/invoices/status";
import { resolveLeaseExpiry } from "@/lib/leases/expiry";
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
  const activeLeases = leases.filter((lease) => lease.status === "ACTIVE");
  const invoices = leases.flatMap((lease) => lease.invoices);
  const payments = invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.number })),
  );

  const now = new Date();
  const outstanding = invoices
    .filter((invoice) => ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status))
    .reduce((total, invoice) => total + remainingGrosze(invoice), 0);
  const totalPaid = payments.reduce((total, payment) => total + payment.amountGrosze, 0);

  // Przy dwóch aktywnych umowach liczy się ta, która kończy się pierwsza —
  // to ona wymaga decyzji najwcześniej.
  const expiry = activeLeases
    .map((lease) => resolveLeaseExpiry(lease.endDate, now))
    .filter((value) => value !== null)
    .sort((a, b) => a.days - b.days)[0];

  const emergencyName = [tenant.emergencyContactFirstName, tenant.emergencyContactLastName]
    .filter(Boolean)
    .join(" ");
  // Każda sekcja pojawia się dopiero, gdy jest co pokazać — pusta ramka
  // z kreskami tylko odsuwałaby rozliczenia w dół.
  const hasIdentity = Boolean(
    tenant.idCardNumber ||
      tenant.pesel ||
      tenant.passportNumber ||
      tenant.residenceCardNumber ||
      tenant.dateOfBirth,
  );
  // Kontakt awaryjny ma własną ramkę: to nie jest dokument najemcy, tylko
  // numer do obcej osoby, po który sięga się w zupełnie innej sytuacji.
  const hasEmergency = Boolean(
    emergencyName || tenant.emergencyContactPhone || tenant.emergencyContactEmail,
  );

  // Adres zameldowania to nie jest adres do faktury — ten drugi siedzi
  // w `tenant.street` i idzie na dokument, ten wchodzi do umowy najmu
  // okazjonalnego. Sklejamy go tu, bo nigdzie indziej się nie pojawia.
  const registeredAddress = [
    tenant.registeredStreet,
    [tenant.registeredPostalCode, tenant.registeredCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const hasRegistered = Boolean(registeredAddress || tenant.registeredUntil);
  const hasBilling = Boolean(
    tenant.billingEmail || tenant.billingPhone || tenant.depositRefundAccount,
  );
  const hasWork = Boolean(tenant.employerName || tenant.employmentUntil);
  const hasInsurance = Boolean(
    tenant.insurerName || tenant.insurancePolicyNumber || tenant.insuranceExpiresAt,
  );

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
              {/* Osoby fizycznej nie oznaczamy — to domyślny przypadek,
                  a plakietka „osoba fizyczna" przy każdym najemcy nie niosłaby
                  żadnej informacji. */}
              {tenant.legalForm === "COMPANY" ? <Badge tone="accent">Firma</Badge> : null}
              {expiry ? (
                <Badge tone={expiry.tone}>
                  <CalendarClock className="h-3 w-3" aria-hidden />
                  {expiry.label}
                </Badge>
              ) : null}
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

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/najemcy/${tenant.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edytuj
              </Link>
            </Button>

            <ArchiveAction
              endpoint="/api/tenants"
              id={tenant.id}
              archived={tenant.archivedAt !== null}
              label="najemcę"
              hint="Zniknie z listy najemców. Jego umowy i wystawione dokumenty zostaną nietknięte — widnieje na nich jako nabywca."
            />

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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Rozliczenia</h2>

          {/* Obsługa płatności siedzi przy najemcy, a nie przy umowie:
              rozliczamy człowieka, a jeden najemca miewa dwie umowy. */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeLeases.length > 0 ? <GenerateInvoices tenantId={tenant.id} /> : null}
            <ManualInvoiceForm
              tenantId={tenant.id}
              tenantName={`${tenant.firstName} ${tenant.lastName}`}
              leases={leases.map((lease) => ({
                id: lease.id,
                label: `${lease.property.name}${lease.room ? ` · ${lease.room.name}` : ""}`,
                rentGrosze: lease.rentGrosze,
              }))}
            />
          </div>
        </div>

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

      {hasIdentity ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <IdCard className="h-4 w-4 text-muted" aria-hidden />
            Dane identyfikacyjne
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="Dowód osobisty" value={tenant.idCardNumber} />
              <DetailItem label="PESEL" value={tenant.pesel} />
              <DetailItem label="Paszport" value={tenant.passportNumber} />
              <DetailItem label="Karta pobytu" value={tenant.residenceCardNumber} />
              <DetailItem
                label="Data urodzenia"
                value={tenant.dateOfBirth ? dateFormat.format(tenant.dateOfBirth) : null}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasEmergency ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <LifeBuoy className="h-4 w-4 text-muted" aria-hidden />
            Kontakt w nagłym wypadku
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="Osoba" value={emergencyName || null} />
              <DetailItem label="Telefon" value={tenant.emergencyContactPhone} />
              <DetailItem label="E-mail" value={tenant.emergencyContactEmail} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasRegistered ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Home className="h-4 w-4 text-muted" aria-hidden />
            Adres zameldowania
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="Adres" value={registeredAddress || null} />
              <DetailItem
                label="Zameldowanie do"
                value={
                  tenant.registeredUntil ? dateFormat.format(tenant.registeredUntil) : "bezterminowo"
                }
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasBilling ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Banknote className="h-4 w-4 text-muted" aria-hidden />
            Płatności
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="E-mail do płatności" value={tenant.billingEmail} />
              <DetailItem label="Telefon do płatności" value={tenant.billingPhone} />
              <DetailItem label="Rachunek do zwrotu kaucji" value={tenant.depositRefundAccount} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasWork ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Briefcase className="h-4 w-4 text-muted" aria-hidden />
            Praca i studia
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="Pracodawca lub uczelnia" value={tenant.employerName} />
              <DetailItem
                label="Do kiedy"
                value={
                  tenant.employmentUntil ? dateFormat.format(tenant.employmentUntil) : "bezterminowo"
                }
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {hasInsurance ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <ShieldCheck className="h-4 w-4 text-muted" aria-hidden />
            Ubezpieczenie najemcy
          </h2>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
              <DetailItem label="Ubezpieczyciel" value={tenant.insurerName} />
              <DetailItem label="Numer polisy" value={tenant.insurancePolicyNumber} />
              {/* Polisa po terminie jest gorsza niż jej brak — właściciel liczy
                  na ochronę, której już nie ma. Dlatego data dostaje kolor. */}
              {tenant.insuranceExpiresAt ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-xs text-muted">Ważna do</p>
                  <p
                    className={`text-sm ${
                      tenant.insuranceExpiresAt < now ? "font-medium text-bad" : "text-fg"
                    }`}
                  >
                    {dateFormat.format(tenant.insuranceExpiresAt)}
                    {tenant.insuranceExpiresAt < now ? " · wygasła" : ""}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

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

/** Wiersz „etykieta + wartość"; brak wartości znaczy, że pole się nie pokazuje. */
function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="truncate text-sm text-fg">{value}</p>
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

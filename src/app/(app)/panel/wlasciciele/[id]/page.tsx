import { ArrowLeft, Building2, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatBankAccount } from "@/lib/bank-account";
import { formatMoney } from "@/lib/money";
import { getOwner } from "@/lib/owners/service";
import { formatPropertyAddress } from "@/lib/properties/address";
import { formatContractPeriod } from "@/lib/validations/owner";
import {
  propertyTypeLabels,
  rentalStatusLabels,
  RENTAL_STATUS_TONE,
} from "@/lib/validations/property";
import {
  panelDictionary,
  panelLocale,
  panelValidationContext,
} from "@/lib/panel/dictionary";
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const owner = await getOwner(session.user.organizationId, id);

  return { title: owner?.name ?? "Właściciel" };
}

export default async function OwnerDetailPage({ params }: Params) {
  const d = await panelDictionary();
  const locale = await panelLocale();
  const t = d.panel.ownersPage;
  const c = await panelValidationContext();
  const session = await requireOwnerSession();
  const { id } = await params;

  const owner = await getOwner(session.user.organizationId, id);
  if (!owner) notFound();

  const address = [owner.street, [owner.postalCode, owner.city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim() !== "")
    .join(", ");

  const contractPeriod = formatContractPeriod(owner.contractStartDate, owner.contractEndDate, c);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/panel/wlasciciele"
          className="inline-flex w-fit items-center gap-1.5 rounded-btn text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.title}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="r-display text-[26px] leading-tight text-fg">{owner.name}</h1>
              {owner.archivedAt ? <Badge tone="warning">{t.archivedBadge}</Badge> : null}
            </div>
            {address ? <p className="text-sm text-muted">{address}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/panel/wlasciciele/${owner.id}/edytuj`}>
                <Pencil className="h-4 w-4" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>

            <ArchiveAction
              endpoint="/api/owners"
              id={owner.id}
              archived={owner.archivedAt !== null}
              label={t.archiveLabel}
              hint={t.archiveHint}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-[13px] font-semibold text-fg">{t.contactSection}</p>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
            {owner.email ? <Term label={t.form.email} value={owner.email} /> : null}
            {owner.phone ? <Term label={t.form.phone} value={owner.phone} /> : null}
            {owner.taxId ? <Term label={t.form.taxId} value={owner.taxId} /> : null}
            {owner.bankAccount ? (
              <Term
                label={t.bankAccountTerm}
                value={formatBankAccount(owner.bankAccount, locale)}
                mono
              />
            ) : null}
            {contractPeriod ? <Term label={t.contractTerm} value={contractPeriod} /> : null}
          </dl>

          {!owner.email && !owner.phone && !owner.taxId && !owner.bankAccount && !contractPeriod ? (
            <p className="text-sm text-muted">
              {t.noContactData}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-fg">
          {t.properties}{" "}
          <span className="font-normal text-muted">({owner.properties.length})</span>
        </h2>

        {owner.properties.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted">
              {t.noProperties}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col p-0">
              {owner.properties.map((property, index) => (
                <Link
                  key={property.id}
                  href={`/panel/nieruchomosci/${property.id}`}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-alt ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-fg">{property.name}</p>
                      <Badge tone={RENTAL_STATUS_TONE[property.status]}>
                        {rentalStatusLabels(d)[property.status]}
                      </Badge>
                      {property.archivedAt ? <Badge tone="warning">{t.archivedProperty}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted">
                      {propertyTypeLabels(d)[property.type]} · {formatPropertyAddress(property)}
                    </p>
                  </div>

                  {property.askingRentGrosze ? (
                    <p className="tabular font-mono text-sm text-fg">
                      {formatMoney(property.askingRentGrosze, locale)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {owner.notes ? (
        <Card className="bg-surface-alt">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <p className="text-[13px] font-semibold text-fg">{t.notes}</p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{owner.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Term({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-medium text-fg ${mono ? "font-mono text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}

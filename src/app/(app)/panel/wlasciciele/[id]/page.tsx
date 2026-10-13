import {
  Archive,
  Building2,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAction } from "@/components/panel/archive/archive-action";
import { PageHeader } from "@/components/panel/page-header";
import { OccupancyBadge } from "@/components/panel/properties/occupancy-badge";
import { PropertyIcon } from "@/components/panel/properties/property-icon";
import { CardRows, DataItem, SectionCard } from "@/components/panel/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireOwnerSession } from "@/lib/auth/session";
import { formatBankAccount } from "@/lib/bank-account";
import { formatMoney } from "@/lib/money";
import { getOwner } from "@/lib/owners/service";
import {
  panelDictionary,
  panelLocale,
  panelValidationContext,
} from "@/lib/panel/dictionary";
import { formatPropertyAddress } from "@/lib/properties/address";
import { formatContractPeriod } from "@/lib/validations/owner";
import { propertyTypeLabels } from "@/lib/validations/property";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireOwnerSession();
  const { id } = await params;
  const owner = await getOwner(session.user.organizationId, id);

  return { title: owner?.name ?? (await panelDictionary()).panel.panelMisc.meta.owner };
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
  const editHref = `/panel/wlasciciele/${owner.id}/edytuj`;
  const hasBillingData = Boolean(address || owner.taxId || owner.bankAccount || contractPeriod);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        back={{ href: "/panel/wlasciciele", label: t.title }}
        title={owner.name}
        badges={
          <>
            {owner.taxId ? <Badge>{t.companyBadge}</Badge> : null}
            {owner.archivedAt ? <Badge tone="warning" icon={Archive}>{t.archivedBadge}</Badge> : null}
          </>
        }
        meta={
          <>
            {owner.phone ? (
              <a href={`tel:${owner.phone}`} className="flex items-center gap-1.5 font-mono hover:text-fg">
                <Phone className="size-4 text-subtle" aria-hidden />
                {owner.phone}
              </a>
            ) : null}
            {owner.email ? (
              <a href={`mailto:${owner.email}`} className="flex min-w-0 items-center gap-1.5 hover:text-fg">
                <Mail className="size-4 shrink-0 text-subtle" aria-hidden />
                <span className="truncate">{owner.email}</span>
              </a>
            ) : null}
          </>
        }
        actions={
          <>
            <ArchiveAction
              endpoint="/api/owners"
              id={owner.id}
              archived={owner.archivedAt !== null}
              label={t.archiveLabel}
              hint={t.archiveHint}
            />
            <Button asChild variant="secondary">
              <Link href={editHref}>
                <Pencil className="size-[18px]" aria-hidden />
                {d.panel.common.edit}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <SectionCard title={t.contactSection}>
            {hasBillingData ? (
              <dl className="flex flex-col gap-4">
                {address ? (
                  <DataItem label={t.addressTerm}>
                    <span className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                      {address}
                    </span>
                  </DataItem>
                ) : null}
                {owner.taxId ? (
                  <DataItem label={t.form.taxId}>
                    <span className="font-mono">{owner.taxId}</span>
                  </DataItem>
                ) : null}
                {owner.bankAccount ? (
                  <DataItem label={t.bankAccountTerm}>
                    <span className="font-mono">{formatBankAccount(owner.bankAccount, locale)}</span>
                  </DataItem>
                ) : null}
                {contractPeriod ? (
                  <DataItem label={t.table.contract}>
                    <span className="font-mono">{contractPeriod}</span>
                  </DataItem>
                ) : null}
              </dl>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-tile bg-accent-soft">
                  <UserRound className="size-6 text-accent" strokeWidth={1.6} aria-hidden />
                </span>
                <p className="text-[15px] font-semibold text-fg">{t.noContactData}</p>
                <Button asChild size="sm" variant="secondary">
                  <Link href={editHref}>
                    <Pencil className="size-4" aria-hidden />
                    {t.fillIn}
                  </Link>
                </Button>
              </div>
            )}
          </SectionCard>

          {owner.notes ? (
            <SectionCard title={t.notes}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{owner.notes}</p>
            </SectionCard>
          ) : null}
        </div>

        <SectionCard
          title={t.properties}
          count={owner.properties.length > 0 ? owner.properties.length : undefined}
        >
          {owner.properties.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-tile bg-accent-soft">
                <Building2 className="size-6 text-accent" strokeWidth={1.6} aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-fg">{t.noProperties}</p>
            </div>
          ) : (
            <CardRows>
              {owner.properties.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/panel/nieruchomosci/${property.id}`}
                    className="group flex items-center gap-3 py-3 lg:gap-4"
                  >
                    <PropertyIcon type={property.type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-fg">
                          {property.name}
                        </span>
                        {property.archivedAt ? (
                          <Badge size="sm" tone="warning" icon={Archive}>
                            {t.archivedProperty}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block text-[13px] text-muted sm:truncate">
                        {propertyTypeLabels(d)[property.type]}, {formatPropertyAddress(property)}
                      </span>
                    </span>
                    {property.askingRentGrosze ? (
                      <span className="hidden font-mono text-sm font-semibold whitespace-nowrap text-fg sm:block">
                        {formatMoney(property.askingRentGrosze, locale)}
                      </span>
                    ) : null}
                    <OccupancyBadge
                      property={{
                        status: property.status,
                        roomCount: 0,
                        occupiedRoomCount: 0,
                        availableRoomCount: 0,
                      }}
                      labels={d.panel.propertiesPage.badge}
                    />
                    <ChevronRight
                      className="hidden size-[18px] text-subtle transition-colors group-hover:text-fg sm:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </CardRows>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

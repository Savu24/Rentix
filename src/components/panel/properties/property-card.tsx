import { Building2, ChevronRight, KeyRound, Layers, Ruler } from "lucide-react";
import Link from "next/link";

import { OccupancyBadge } from "@/components/panel/properties/occupancy-badge";
import { PropertyIcon } from "@/components/panel/properties/property-icon";
import { Badge } from "@/components/ui/badge";
import { fill, formatArea } from "@/lib/i18n/format";
import { panelDictionary, panelLocale } from "@/lib/panel/dictionary";
import { formatPropertyAddress } from "@/lib/properties/address";
import type { PropertyListItem } from "@/lib/properties/service";
import { cn } from "@/lib/utils";
import { propertyTypeLabels } from "@/lib/validations/property";

/*
  Lista nieruchomości (redesign/03-nieruchomosci-lista-*.svg): gęsta tabela
  na desktopie, karty na telefonie. Bez wchodzenia w kartę widać wszystko,
  co było na liście: adres, typ, pokoje, piętro, metraż i kod do domofonu.
*/

/** Kolumny tabeli — te same dla nagłówka i wierszy. */
const COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_120px_128px_56px_88px_104px_168px_18px] lg:items-center lg:gap-4";

export async function PropertyTableHead() {
  const t = (await panelDictionary()).panel.propertiesPage.table;

  return (
    <div
      className={cn(
        COLUMNS,
        "hidden h-10 border-b border-border bg-hover px-6 text-[12.5px] font-[550] text-muted",
      )}
    >
      <span>{t.property}</span>
      <span>{t.type}</span>
      <span>{t.rooms}</span>
      <span>{t.floor}</span>
      <span>{t.area}</span>
      <span>{t.intercom}</span>
      <span className="text-right">{t.status}</span>
      <span />
    </div>
  );
}

function Fact({
  icon: Icon,
  children,
  strong,
}: {
  icon: typeof Ruler;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] bg-surface-alt px-2 text-[13px] font-[550] text-muted">
      <Icon className="size-3 text-subtle" strokeWidth={2} aria-hidden />
      <span className={cn("font-mono", strong && "text-fg")}>{children}</span>
    </span>
  );
}

export async function PropertyCard({ property }: { property: PropertyListItem }) {
  const [d, locale] = await Promise.all([panelDictionary(), panelLocale()]);
  const t = d.panel.propertiesPage;

  const address = formatPropertyAddress(property);
  const typeLabel = propertyTypeLabels(d)[property.type];
  const floor =
    property.floor === null ? null : property.floor === 0 ? t.groundFloor : String(property.floor);
  const area = property.areaM2 ? formatArea(property.areaM2, locale) : null;
  const full = property.roomCount > 0 && property.occupiedRoomCount === property.roomCount;

  const meter =
    property.roomCount > 0 ? (
      <span className="flex items-center gap-2.5">
        <span
          className="block h-1.5 w-[100px] overflow-hidden rounded-full bg-surface-alt lg:w-[76px]"
          aria-hidden
        >
          <span
            className={cn("block h-full rounded-full", full ? "bg-good" : "bg-accent")}
            style={{ width: `${property.occupancyPercent}%` }}
          />
        </span>
        <span className="font-mono text-[13px] font-[550] text-muted lg:text-[13.5px]">
          <span className="lg:hidden">
            {fill(t.roomsOccupied, {
              occupied: property.occupiedRoomCount,
              total: property.roomCount,
            })}
          </span>
          <span className="hidden lg:inline">
            {property.occupiedRoomCount}/{property.roomCount}
          </span>
        </span>
      </span>
    ) : (
      <span className="text-sm text-subtle">{t.whole}</span>
    );

  return (
    <li className="lg:border-t lg:border-border lg:first:border-t-0">
      <Link
        href={`/panel/nieruchomosci/${property.id}`}
        className={cn(
          COLUMNS,
          "group flex flex-col gap-3 rounded-tile border border-border bg-surface p-4 transition-colors",
          "lg:min-h-[72px] lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 lg:py-3 lg:hover:bg-hover",
        )}
      >
        <span className="flex min-w-0 items-center gap-3 lg:gap-4">
          <PropertyIcon type={property.type} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold text-fg lg:text-[14.5px]">
                {property.name}
              </span>
              {property.archivedAt ? (
                <Badge size="sm" className="shrink-0">
                  {t.detail.archived}
                </Badge>
              ) : null}
            </span>
            <span className="block truncate text-[13px] text-muted">{address}</span>
          </span>
        </span>

        {/* Telefon: fakty jako żetony pod nazwą. */}
        <span className="flex flex-wrap gap-1.5 lg:hidden">
          <Fact icon={Building2}>{typeLabel}</Fact>
          {floor !== null ? (
            <Fact icon={Layers}>
              {property.floor === 0 ? floor : fill(t.detail.floor, { floor: floor })}
            </Fact>
          ) : null}
          {area ? <Fact icon={Ruler}>{area}</Fact> : null}
          {/* Kod do domofonu na liście, bo po niego się tu wraca — zwykle
              stojąc przed budynkiem z telefonem w ręku. */}
          {property.intercomCode ? (
            <Fact icon={KeyRound} strong>
              {property.intercomCode}
            </Fact>
          ) : null}
        </span>

        {/* Desktop: kolumny tabeli. */}
        <span className="hidden truncate text-sm text-muted lg:block">{typeLabel}</span>
        <span className="hidden lg:block">{meter}</span>
        <span className="hidden font-mono text-sm text-muted lg:block">{floor ?? ""}</span>
        <span className="hidden font-mono text-sm whitespace-nowrap text-muted lg:block">
          {area ?? ""}
        </span>
        <span className="hidden lg:block">
          {property.intercomCode ? (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-badge bg-surface-alt px-2">
              <KeyRound className="size-3.5 text-subtle" strokeWidth={2} aria-hidden />
              <span className="font-mono text-[13.5px] font-semibold text-fg">
                {property.intercomCode}
              </span>
            </span>
          ) : null}
        </span>

        <span className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="lg:hidden">{meter}</span>
          <OccupancyBadge property={property} labels={t.badge} />
        </span>
        <ChevronRight
          className="hidden size-[18px] text-subtle transition-colors group-hover:text-fg lg:block"
          aria-hidden
        />
      </Link>
    </li>
  );
}

import { AlertCircle, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

import { OccupancyBadge } from "@/components/panel/properties/occupancy-badge";
import { PropertyIcon } from "@/components/panel/properties/property-icon";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/ui/money-display";
import type { DashboardOverview } from "@/lib/dashboard/service";
import type { Locale } from "@/lib/i18n/config";
import { fill, formatDateIn, pluralize } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/types";
import { formatMoney } from "@/lib/money";
import { cn, initials } from "@/lib/utils";

/*
  Sekcje pulpitu (redesign/02-pulpit-*.svg). Liczba przed zdaniem: każdy
  blok ma etykietę, kwotę i kolor, bez podpisów objaśniających. Wszystkie
  liczby przychodzą gotowe z `dashboardOverview` — tu nic się nie liczy.
*/

type T = Dictionary["panel"]["dashboard"];

function plural(locale: Locale, count: number, forms: readonly string[]) {
  return fill(pluralize(locale, count, forms), { count });
}

/** Pasek wypełnienia (obłożenie). Szerokość z gotowego procentu. */
function Meter({ percent, full, className }: { percent: number; full?: boolean; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-alt", className)} aria-hidden>
      <span
        className={cn("block h-full rounded-full", full ? "bg-good" : "bg-accent")}
        style={{ width: `${Math.min(100, Math.max(percent, 0))}%` }}
      />
    </span>
  );
}

// ── Pas kluczowych liczb ──────────────────────────────────────────────────

export function KeyFigures({
  data,
  t,
  propertiesShort,
  locale,
}: {
  data: DashboardOverview;
  t: T;
  /** „Obiekty" — krótsza etykieta w wąskim kaflu na telefonie. */
  propertiesShort: string;
  locale: Locale;
}) {
  const { arrears, occupancy, properties, rooms } = data;
  const inArrears = arrears.grosze > 0;

  const arrearsCell = (
    <Link
      href="/panel/finanse?status=OVERDUE"
      className="group flex flex-col gap-4 rounded-tile border border-border bg-surface p-5 transition-colors hover:bg-hover lg:rounded-none lg:border-0 lg:bg-transparent lg:p-7"
    >
      <span className="flex items-center gap-2 text-sm font-[550] text-muted">
        <AlertCircle
          className={cn("size-[18px]", inArrears ? "text-bad" : "text-good")}
          strokeWidth={1.9}
          aria-hidden
        />
        {t.statArrears}
      </span>
      <MoneyDisplay
        grosze={arrears.grosze}
        locale={locale}
        className={cn(
          "text-[38px] leading-none tracking-[-1px] lg:text-[46px] lg:tracking-[-1.2px]",
          inArrears ? "text-bad" : "text-fg",
        )}
      />
      <span className="flex items-center justify-between gap-3">
        {inArrears ? (
          <Badge tone="critical" icon={AlertCircle}>{plural(locale, arrears.count, t.overdueInvoices)}</Badge>
        ) : (
          <Badge tone="good" icon={CheckCircle2}>
            {t.allSettled}
          </Badge>
        )}
        <span className="flex items-center gap-1 text-[13.5px] font-semibold text-accent group-hover:underline">
          {t.show}
          <ArrowRight className="size-4" strokeWidth={1.9} aria-hidden />
        </span>
      </span>
    </Link>
  );

  const cells = [
    {
      label: t.statOccupancy,
      short: t.statOccupancy,
      value: String(occupancy.percent),
      unit: "%",
      /* Przy pełnym obłożeniu filtr „z wolnymi" dałby pustą listę,
         więc wtedy kafel prowadzi po prostu do wszystkich obiektów. */
      href:
        occupancy.occupied < occupancy.total
          ? "/panel/nieruchomosci?occupancy=vacant"
          : "/panel/nieruchomosci",
      extra: (
        <>
          <Meter percent={occupancy.percent} className="w-full max-w-[168px]" />
          <span className="text-[13px] text-muted">
            {fill(t.statOccupancyHint, { occupied: occupancy.occupied, total: occupancy.total })}
          </span>
        </>
      ),
    },
    {
      label: t.statProperties,
      short: propertiesShort,
      value: String(properties.count),
      unit: "",
      href: "/panel/nieruchomosci",
      extra:
        properties.underRefurbishment > 0 ? (
          <span className="text-[13px] text-muted">
            {fill(t.propertiesRenovating, { count: properties.underRefurbishment })}
          </span>
        ) : null,
    },
    {
      label: t.statRooms,
      short: t.statRooms,
      value: String(rooms.count),
      unit: "",
      href: "/panel/nieruchomosci",
      extra:
        rooms.count > 0 ? (
          <span className="text-[13px] text-muted">
            {rooms.vacant > 0 ? plural(locale, rooms.vacant, t.roomsVacant) : t.roomsAllLet}
          </span>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[424px_repeat(3,minmax(0,1fr))] lg:gap-0 lg:overflow-hidden lg:rounded-tile lg:border lg:border-border lg:bg-surface">
      {arrearsCell}

      <div className="grid grid-cols-3 gap-2 lg:contents">
        {cells.map((cell) => (
          <Link
            key={cell.label}
            href={cell.href}
            className={cn(
              "relative flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-4 transition-colors hover:bg-hover",
              "lg:gap-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-7",
              // Pionowa kreska między komórkami, odsunięta od krawędzi płyty.
              "lg:before:absolute lg:before:inset-y-6 lg:before:left-0 lg:before:w-px lg:before:bg-border",
            )}
          >
            <span className="truncate text-[13px] font-[550] text-muted lg:text-sm">
              <span className="lg:hidden">{cell.short}</span>
              <span className="hidden lg:inline">{cell.label}</span>
            </span>
            <span className="font-mono text-[28px] leading-none font-[650] tracking-[-0.6px] text-fg lg:text-4xl lg:tracking-[-0.8px]">
              {cell.value}
              {cell.unit ? (
                <span className="text-[17px] font-semibold tracking-normal text-muted lg:text-[22px]">
                  {cell.unit}
                </span>
              ) : null}
            </span>
            {cell.extra ? <span className="hidden flex-col gap-2 lg:flex">{cell.extra}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Panel z listą ─────────────────────────────────────────────────────────

/**
 * Sekcja z listą. Na telefonie tytuł stoi nad kartą (17 px), na desktopie
 * w karcie (15 px) — tak rysuje je projekt.
 */
export function DashboardPanel({
  title,
  count,
  action,
  className,
  children,
}: {
  title: string;
  count?: number;
  action?: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 lg:gap-1 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:pt-5 lg:pb-2",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 lg:px-6">
        <h2 className="flex items-center gap-2 text-[17px] font-[650] text-fg lg:text-[15px] lg:font-semibold">
          {title}
          {count !== undefined && count > 0 ? (
            <Badge size="sm" className="hidden lg:inline-flex">
              {count}
            </Badge>
          ) : null}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="flex items-center gap-1 text-sm font-[550] text-accent hover:underline lg:text-[13.5px]"
          >
            {action.label}
            <ArrowRight className="hidden size-[18px] lg:block" strokeWidth={1.8} aria-hidden />
          </Link>
        ) : null}
      </header>
      <div className="overflow-hidden rounded-tile border border-border bg-surface lg:rounded-none lg:border-0 lg:bg-transparent">
        {children}
      </div>
    </section>
  );
}

/** Pusta lista: jedna linijka z ptaszkiem, bez zdań objaśniających. */
export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 px-4 py-5 text-sm text-muted lg:px-6">
      <CheckCircle2 className="size-[18px] shrink-0 text-good" aria-hidden />
      {children}
    </p>
  );
}

const rowLink =
  "flex items-center gap-3 px-4 transition-colors hover:bg-hover lg:mx-2 lg:rounded-[10px] lg:px-4";

/** Lista z kreskami między wierszami, odsuniętymi od krawędzi karty. */
function RowList({ children }: { children: React.ReactNode }) {
  return (
    <ul
      className={cn(
        "[&>li]:relative [&>li+li]:before:absolute [&>li+li]:before:inset-x-4 [&>li+li]:before:top-0",
        "[&>li+li]:before:h-px [&>li+li]:before:bg-border lg:[&>li+li]:before:inset-x-6",
      )}
    >
      {children}
    </ul>
  );
}

// ── Po terminie ───────────────────────────────────────────────────────────

export function OverdueList({ data, t, locale }: { data: DashboardOverview; t: T; locale: Locale }) {
  if (data.overdue.length === 0) return <EmptyRow>{t.overdueEmpty}</EmptyRow>;

  return (
    <RowList>
      {data.overdue.map((row) => (
        <li key={row.id}>
          <Link href={`/panel/finanse/${row.id}`} className={cn(rowLink, "h-[72px]")}>
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent2-soft text-[13.5px] font-semibold text-accent2"
              aria-hidden
            >
              {initials(row.buyerName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{row.buyerName}</span>
              {row.place ? (
                <span className="block truncate text-[13px] text-muted">{row.place}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-[14.5px] font-[650] whitespace-nowrap text-bad lg:text-[15px]">
                {formatMoney(row.remainingGrosze, locale)}
              </span>
              <span className="block text-[13px] whitespace-nowrap text-muted">
                <span className="lg:hidden">{plural(locale, row.daysOverdue, t.overdueDaysShort)}</span>
                <span className="hidden lg:inline">{plural(locale, row.daysOverdue, t.overdueDays)}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </RowList>
  );
}

// ── Najbliższe terminy ────────────────────────────────────────────────────

export function UpcomingList({ data, t, locale }: { data: DashboardOverview; t: T; locale: Locale }) {
  if (data.upcoming.length === 0) return <EmptyRow>{t.upcomingEmpty}</EmptyRow>;

  return (
    <RowList>
      {data.upcoming.map((row) => (
        <li key={row.id}>
          <Link href={`/panel/finanse/${row.id}`} className={cn(rowLink, "h-16 lg:h-14")}>
            {/* „Kalendarzyk" z datą zamiast zdania o terminie. */}
            <span
              className={cn(
                "flex size-10 shrink-0 flex-col items-center justify-center rounded-[10px] leading-none",
                row.tone === "warning" ? "bg-warn-soft text-warn-ink" : "bg-info-soft text-info-ink",
              )}
            >
              <span className="font-mono text-[15px] font-[650]">{formatDateIn(row.dueDate, locale, "day")}</span>
              <span className="mt-0.5 text-[11px] font-[550]">{formatDateIn(row.dueDate, locale, "monthShort")}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{row.buyerName}</span>
              <span className="block text-[13px] text-muted">
                {row.daysUntil === 0 ? t.dueToday : plural(locale, row.daysUntil, t.dueIn)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold whitespace-nowrap text-fg">
              {formatMoney(row.remainingGrosze, locale)}
            </span>
          </Link>
        </li>
      ))}
    </RowList>
  );
}

// ── Nieruchomości ─────────────────────────────────────────────────────────

export function PropertyList({
  data,
  labels,
}: {
  data: DashboardOverview;
  labels: Dictionary["panel"]["propertiesPage"]["badge"];
}) {
  return (
    <RowList>
      {data.properties.rows.map((property) => {
        const full = property.roomCount > 0 && property.occupiedRoomCount === property.roomCount;

        return (
          <li key={property.id}>
            <Link href={`/panel/nieruchomosci/${property.id}`} className={cn(rowLink, "h-14")}>
              <span className="hidden lg:block">
                <PropertyIcon type={property.type} small />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                {property.name}
              </span>
              {property.roomCount > 0 ? (
                <span className="flex shrink-0 items-center gap-3">
                  <Meter percent={property.occupancyPercent} full={full} className="w-16 lg:w-[120px]" />
                  <span className="w-9 font-mono text-[13px] font-[550] text-muted">
                    {property.occupiedRoomCount}/{property.roomCount}
                  </span>
                </span>
              ) : null}
              <OccupancyBadge
                property={property}
                labels={labels}
                className="hidden w-[148px] justify-center lg:inline-flex"
              />
            </Link>
          </li>
        );
      })}
    </RowList>
  );
}

// ── Kończące się umowy ────────────────────────────────────────────────────

export function ExpiringList({ data, t, locale }: { data: DashboardOverview; t: T; locale: Locale }) {
  if (data.expiring.length === 0) return <EmptyRow>{t.expiringEmpty}</EmptyRow>;

  return (
    <RowList>
      {data.expiring.map((row) => (
        <li key={row.id}>
          <Link href={`/panel/umowy/${row.id}`} className={cn(rowLink, "h-16")}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{row.place}</span>
              <span className="block truncate text-[13px] text-muted">{row.tenants.join(", ")}</span>
            </span>
            <Badge
              tone={
                row.expiry.tone === "critical"
                  ? "critical"
                  : row.expiry.tone === "warning"
                    ? "warning"
                    : "neutral"
              }
              icon={Clock}
            >
              {row.expiry.days === 0 ? t.expiringToday : plural(locale, row.expiry.days, t.expiringDays)}
            </Badge>
          </Link>
        </li>
      ))}
    </RowList>
  );
}

// ── Wpłaty w miesiącu ─────────────────────────────────────────────────────

export function PaymentsTile({ data, t, locale }: { data: DashboardOverview; t: T; locale: Locale }) {
  const { payments } = data;

  return (
    <Link
      href="/panel/finanse"
      className="flex items-end justify-between gap-4 rounded-card border border-border bg-surface px-6 py-5 transition-colors hover:bg-hover"
    >
      <span className="flex min-w-0 flex-col gap-3">
        <span className="text-sm font-[550] text-muted">
          {fill(t.paymentsIn, { month: t.paymentsMonths[payments.month] ?? "" })}
        </span>
        <MoneyDisplay
          grosze={payments.grosze}
          locale={locale}
          className="text-[30px] leading-none tracking-[-0.6px] text-fg"
          currencyClassName="text-muted"
        />
      </span>
      {payments.count > 0 ? (
        <Badge tone="good" icon={CheckCircle2} className="mb-0.5">
          {plural(locale, payments.count, t.paymentsCount)}
        </Badge>
      ) : null}
    </Link>
  );
}

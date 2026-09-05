"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { invoiceKindLabels } from "@/lib/validations/invoice";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_META } from "@/lib/i18n/config";
import { fill, pluralize } from "@/lib/i18n/format";
/**
 * Filtry listy dokumentów.
 *
 * Stan trzymamy w URL-u, tak jak przy nieruchomościach: widok da się wysłać
 * linkiem i cofnąć przyciskiem wstecz, a serwer renderuje listę już
 * przefiltrowaną.
 */
/** Kolejność pozycji w filtrze; napisy przychodzą ze słownika. */
const STATUS_VALUES = ["all", "UNPAID", "OVERDUE", "PAID", "CANCELLED"] as const;

/** Filtry szczegółowe — pola, które mają własny wiersz w rozwijanym panelu. */
const DETAILED_KEYS = [
  "kind",
  "issuedFrom",
  "issuedTo",
  "dueFrom",
  "dueTo",
  "minAmount",
  "maxAmount",
] as const;

export function InvoiceFilters({ total }: { total: number }) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.invoiceFilters;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const isFirstRender = useRef(true);

  // Panel otwiera się sam, gdy w adresie siedzi już jakiś filtr szczegółowy —
  // inaczej wklejony link filtrowałby listę w sposób niewidoczny na ekranie.
  const [detailed, setDetailed] = useState(() =>
    DETAILED_KEYS.some((key) => Boolean(searchParams.get(key))),
  );

  function apply(next: URLSearchParams) {
    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    apply(next);
  }

  // Bez opóźnienia każda wpisana litera byłaby osobnym zapytaniem do bazy.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = query.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      apply(next);
    }, 300);

    return () => clearTimeout(timer);
    // `searchParams` celowo pominięte — reagujemy na zmianę tekstu, a nie
    // na własne zapisy do URL-a.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeDetailed = DETAILED_KEYS.filter((key) => Boolean(searchParams.get(key))).length;

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    (searchParams.get("status") ?? "all") !== "all" ||
    activeDetailed > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            className="pl-10"
          />
        </div>

        <Select
          aria-label={t.statusLabel}
          value={searchParams.get("status") ?? "all"}
          onChange={(event) => setParam("status", event.target.value)}
          className="sm:w-48"
        >
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {d.panel.panelMisc.invoiceStatusFilter[value]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Button
          type="button"
          size="sm"
          variant={detailed ? "secondary" : "ghost"}
          onClick={() => setDetailed((current) => !current)}
          aria-expanded={detailed}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {d.panel.panelMisc.detailedFilters}
          {activeDetailed > 0 ? (
            <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-accent-contrast">
              {activeDetailed}
            </span>
          ) : null}
        </Button>
      </div>

      {detailed ? (
        <div className="grid gap-4 rounded-control border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="f-kind" label={t.kind}>
            <Select
              id="f-kind"
              value={searchParams.get("kind") ?? "all"}
              onChange={(event) => setParam("kind", event.target.value)}
            >
              <option value="all">{t.all}</option>
              {Object.entries(invoiceKindLabels(d)).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="f-issuedFrom" label={t.issuedFrom}>
            <DateInput
              id="f-issuedFrom"
              value={searchParams.get("issuedFrom") ?? ""}
              onChange={(event) => setParam("issuedFrom", event.target.value)}
            />
          </FormField>

          <FormField id="f-issuedTo" label={t.issuedTo}>
            <DateInput
              id="f-issuedTo"
              value={searchParams.get("issuedTo") ?? ""}
              onChange={(event) => setParam("issuedTo", event.target.value)}
            />
          </FormField>

          <FormField id="f-dueFrom" label={t.dueFrom}>
            <DateInput
              id="f-dueFrom"
              value={searchParams.get("dueFrom") ?? ""}
              onChange={(event) => setParam("dueFrom", event.target.value)}
            />
          </FormField>

          <FormField id="f-dueTo" label={t.dueTo}>
            <DateInput
              id="f-dueTo"
              value={searchParams.get("dueTo") ?? ""}
              onChange={(event) => setParam("dueTo", event.target.value)}
            />
          </FormField>

          <FormField id="f-minAmount" label={fill(t.amountFrom, { currency: LOCALE_META[locale].currency })}>
            <Input
              id="f-minAmount"
              inputMode="decimal"
              defaultValue={searchParams.get("minAmount") ?? ""}
              onBlur={(event) => setParam("minAmount", event.target.value)}
            />
          </FormField>

          <FormField id="f-maxAmount" label={fill(t.amountTo, { currency: LOCALE_META[locale].currency })}>
            <Input
              id="f-maxAmount"
              inputMode="decimal"
              defaultValue={searchParams.get("maxAmount") ?? ""}
              onBlur={(event) => setParam("maxAmount", event.target.value)}
            />
          </FormField>
        </div>
      ) : null}

      <div className="flex min-h-5 items-center gap-3 text-xs text-muted">
        <span aria-live="polite">
          {isPending
            ? t.filtering
            : fill(pluralize(locale, total, d.panel.financePage.documentNoun), {
                count: total,
              })}
        </span>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              apply(new URLSearchParams());
            }}
            className="inline-flex items-center gap-1 rounded-btn font-medium text-accent hover:underline"
          >
            <X className="h-3 w-3" aria-hidden />
            {t.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { expenseCategoryLabels, EXPENSE_CATEGORY_ORDER } from "@/lib/validations/expense";
import { useI18n } from "@/lib/i18n/client";
import { fill, monthNames, pluralize } from "@/lib/i18n/format";
/** Filtry listy kosztów. Stan w URL-u, jak przy pozostałych listach. */
export function ExpenseFilters({
  total,
  years,
  properties,
}: {
  total: number;
  years: number[];
  properties: Array<{ id: string; name: string }>;
}) {
  const { d, locale } = useI18n();
  const t = d.panel.financePage.expenseFilters;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const isFirstRender = useRef(true);

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
    // Reagujemy na zmianę tekstu, a nie na własne zapisy do URL-a.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /*
    Miesiąc ma sens tylko w obrębie roku. Wybór miesiąca przy „wszystkich
    latach" dobiera najnowszy rok z listy, a powrót do wszystkich lat zdejmuje
    miesiąc — inaczej w adresie zostałby filtr, którego lista nie stosuje.
  */
  function setYear(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set("year", value);
    else {
      next.delete("year");
      next.delete("month");
    }
    apply(next);
  }

  function setMonth(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set("month", value);
      if (!next.get("year")) next.set("year", String(years[0] ?? new Date().getFullYear()));
    } else {
      next.delete("month");
    }
    apply(next);
  }

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("category")) ||
    Boolean(searchParams.get("propertyId")) ||
    Boolean(searchParams.get("year")) ||
    Boolean(searchParams.get("month"));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2.5 xl:flex-row xl:flex-wrap xl:items-center">
        <div className="relative xl:w-60">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-subtle"
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

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          <Select
            aria-label={t.year}
            value={searchParams.get("year") ?? "all"}
            onChange={(event) => setYear(event.target.value)}
            className="sm:w-[150px]"
          >
            <option value="all">{t.allYears}</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t.month}
            value={searchParams.get("month") ?? "all"}
            onChange={(event) => setMonth(event.target.value)}
            className="sm:w-[190px]"
          >
            <option value="all">{t.allMonths}</option>
            {monthNames(locale).map((name, index) => (
              <option key={name} value={index + 1}>
                {/* Intl podaje polskie miesiące małą literą — na liście wyboru
                    stoją same, więc zaczynają się wielką. */}
                {name.charAt(0).toLocaleUpperCase() + name.slice(1)}
              </option>
            ))}
          </Select>

          <div className="col-span-2 sm:col-span-1">
          <Select
            aria-label={t.category}
            value={searchParams.get("category") ?? "all"}
            onChange={(event) => setParam("category", event.target.value)}
            className="sm:w-[200px]"
          >
            <option value="all">{t.allCategories}</option>
            {EXPENSE_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {expenseCategoryLabels(d)[value]}
              </option>
            ))}
          </Select>
          </div>

          {properties.length > 0 ? (
            <div className="col-span-2 sm:col-span-1">
            <Select
              aria-label={t.property}
              value={searchParams.get("propertyId") ?? "all"}
              onChange={(event) => setParam("propertyId", event.target.value)}
              className="sm:w-[220px]"
            >
              <option value="all">{t.allProperties}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-5 items-center gap-3 text-[13.5px] text-muted">
        <span aria-live="polite">
          {isPending ? t.filtering : fill(pluralize(locale, total, t.counted), { count: total })}
        </span>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              apply(new URLSearchParams());
            }}
            className="inline-flex items-center gap-1 rounded-btn font-[550] whitespace-nowrap text-accent hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            {t.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}

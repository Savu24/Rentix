"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { plural } from "@/lib/utils";
import { expenseCategoryLabels, EXPENSE_CATEGORY_ORDER } from "@/lib/validations/expense";
import { useI18n } from "@/lib/i18n/client";
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
  const { d } = useI18n();
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

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("category")) ||
    Boolean(searchParams.get("propertyId")) ||
    Boolean(searchParams.get("year"));

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
            placeholder="Szukaj po opisie, dostawcy lub numerze dokumentu…"
            aria-label="Szukaj kosztów"
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:w-auto">
          <Select
            aria-label="Rok"
            value={searchParams.get("year") ?? "all"}
            onChange={(event) => setParam("year", event.target.value)}
            className="sm:w-32"
          >
            <option value="all">Wszystkie lata</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Kategoria"
            value={searchParams.get("category") ?? "all"}
            onChange={(event) => setParam("category", event.target.value)}
            className="sm:w-52"
          >
            <option value="all">Wszystkie kategorie</option>
            {EXPENSE_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {expenseCategoryLabels(d)[value]}
              </option>
            ))}
          </Select>

          {properties.length > 0 ? (
            <Select
              aria-label="Nieruchomość"
              value={searchParams.get("propertyId") ?? "all"}
              onChange={(event) => setParam("propertyId", event.target.value)}
              className="sm:w-52"
            >
              <option value="all">Wszystkie nieruchomości</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-5 items-center gap-3 text-xs text-muted">
        <span aria-live="polite">
          {isPending ? "Filtrowanie…" : `${total} ${plural(total, ["koszt", "koszty", "kosztów"])}`}
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
            Wyczyść filtry
          </button>
        ) : null}
      </div>
    </div>
  );
}

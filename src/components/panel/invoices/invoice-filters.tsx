"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { plural } from "@/lib/utils";

/**
 * Filtry listy dokumentów.
 *
 * Stan trzymamy w URL-u, tak jak przy nieruchomościach: widok da się wysłać
 * linkiem i cofnąć przyciskiem wstecz, a serwer renderuje listę już
 * przefiltrowaną.
 */
const STATUS_OPTIONS: Array<[string, string]> = [
  ["all", "Wszystkie"],
  ["UNPAID", "Nieopłacone"],
  ["OVERDUE", "Zaległości"],
  ["PAID", "Opłacone"],
  ["CANCELLED", "Anulowane"],
];

export function InvoiceFilters({ total }: { total: number }) {
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

  const hasFilters =
    Boolean(searchParams.get("q")) || (searchParams.get("status") ?? "all") !== "all";

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
            placeholder="Szukaj po numerze, najemcy lub nieruchomości…"
            aria-label="Szukaj dokumentów"
            className="pl-10"
          />
        </div>

        <Select
          aria-label="Status rozliczenia"
          value={searchParams.get("status") ?? "all"}
          onChange={(event) => setParam("status", event.target.value)}
          className="sm:w-48"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex min-h-5 items-center gap-3 text-xs text-muted">
        <span aria-live="polite">
          {isPending
            ? "Filtrowanie…"
            : `${total} ${plural(total, ["dokument", "dokumenty", "dokumentów"])}`}
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

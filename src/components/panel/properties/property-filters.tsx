"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { propertyTypeLabels } from "@/lib/validations/property";
import { useI18n } from "@/lib/i18n/client";
import { fill, pluralize } from "@/lib/i18n/format";
/**
 * Filtry listy nieruchomości.
 *
 * Stan filtrów mieszka w URL-u, nie w useState: dzięki temu widok da się
 * odświeżyć, wysłać linkiem i cofnąć przyciskiem wstecz. Serwer czyta
 * te same parametry, więc lista renderuje się po stronie serwera już
 * przefiltrowana.
 */
export function PropertyFilters({ total }: { total: number }) {
  const { d, locale } = useI18n();
  const t = d.panel.propertiesPage.filters;
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

  // Wyszukiwanie z opóźnieniem — bez tego każda litera to jedno zapytanie do bazy.
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
    // `searchParams` celowo pominięte: reagujemy na zmianę tekstu, a nie
    // na własne zapisy do URL-a — inaczej efekt zapętliłby się sam ze sobą.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("type")) ||
    (searchParams.get("occupancy") ?? "all") !== "all";

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

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:w-auto">
          <Select
            aria-label={t.typeLabel}
            value={searchParams.get("type") ?? "all"}
            onChange={(event) => setParam("type", event.target.value)}
            className="sm:w-44"
          >
            <option value="all">{t.allTypes}</option>
            {Object.entries(propertyTypeLabels(d)).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t.availabilityLabel}
            value={searchParams.get("occupancy") ?? "all"}
            onChange={(event) => setParam("occupancy", event.target.value)}
            className="sm:w-40"
          >
            <option value="all">{t.all}</option>
            <option value="vacant">{t.vacant}</option>
            <option value="occupied">{t.occupied}</option>
            <option value="unavailable">{t.underRefurbishment}</option>
          </Select>
        </div>
      </div>

      <div className="flex min-h-5 items-center gap-3 text-xs text-muted">
        <span aria-live="polite">
          {isPending
            ? t.filtering
            : fill(pluralize(locale, total, t.counted), { count: total })}
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

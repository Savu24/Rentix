"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Wyszukiwarka i filtry list w panelu administratora.
 *
 * Jeden komponent na obie listy — organizacji i kont — bo różnią się wyłącznie
 * zawartością list rozwijanych. Stan mieszka w URL-u, tak samo jak w panelu
 * klienta: widok da się wtedy odświeżyć, wysłać linkiem i cofnąć wstecz,
 * a serwer renderuje listę już przefiltrowaną.
 */

export type AdminFilterSelect = {
  /** Nazwa parametru w adresie. */
  key: string;
  label: string;
  /** Napis pozycji „wszystkie" — wartość pusta czyści filtr. */
  allLabel: string;
  options: { value: string; label: string }[];
};

export function AdminFilters({
  placeholder,
  selects = [],
  total,
  totalLabel,
}: {
  placeholder: string;
  selects?: AdminFilterSelect[];
  total: number;
  totalLabel: string;
}) {
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
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  }

  // Wyszukiwanie z opóźnieniem — bez tego każda litera to jedno zapytanie
  // przez wszystkie konta platformy.
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
    // `searchParams` celowo pominięte: reagujemy na zmianę tekstu, a nie na
    // własne zapisy do URL-a — inaczej efekt zapętliłby się sam ze sobą.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
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
            placeholder={placeholder}
            aria-label={placeholder}
            className="pl-10"
          />
        </div>

        {selects.map((select) => (
          <Select
            key={select.key}
            aria-label={select.label}
            value={searchParams.get(select.key) ?? ""}
            onChange={(event) => setParam(select.key, event.target.value)}
            className="sm:w-44"
          >
            <option value="">{select.allLabel}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
      </div>

      <p aria-live="polite" className="text-xs text-muted">
        {isPending ? "Szukam…" : `${total} ${totalLabel}`}
      </p>
    </div>
  );
}

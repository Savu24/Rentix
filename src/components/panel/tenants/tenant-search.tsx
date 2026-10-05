"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

/**
 * Wyszukiwarka najemców.
 *
 * Fraza siedzi w URL-u obok porządku, tak jak filtry dokumentów: wynik da się
 * wysłać linkiem, a filtruje serwer. Wybrany porządek zostaje — szukanie
 * zawęża listę, a nie przestawia jej od nowa.
 */
export function TenantSearch() {
  const { d } = useI18n();
  const t = d.panel.tenantsPage;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const isFirstRender = useRef(true);

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

      const queryString = next.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timer);
    // `searchParams` celowo pominięte — reagujemy na zmianę tekstu, a nie
    // na własne zapisy do URL-a.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
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
        aria-busy={isPending}
        className="pl-10"
      />
    </div>
  );
}

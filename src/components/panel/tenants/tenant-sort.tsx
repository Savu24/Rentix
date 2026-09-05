"use client";

import { ArrowDownUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import { tenantSortLabels, TENANT_SORT_OPTIONS } from "@/lib/validations/tenant";
import { useI18n } from "@/lib/i18n/client";
/**
 * Porządek listy najemców.
 *
 * Wybór siedzi w URL-u, jak filtry przy nieruchomościach: widok da się wysłać
 * linkiem, cofnąć przyciskiem wstecz i odświeżyć bez utraty ustawienia,
 * a sortuje serwer — klient nie dostaje listy tylko po to, żeby ją przełożyć.
 */
export function TenantSort() {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setSort(value: string) {
    const next = new URLSearchParams(searchParams);
    // „Nazwisko" to domyślny porządek — nie zaśmieca adresu.
    if (value === "name") next.delete("sort");
    else next.set("sort", value);

    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <ArrowDownUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="shrink-0">Sortuj</span>
      <Select
        aria-label="Sortowanie najemców"
        value={searchParams.get("sort") ?? "name"}
        onChange={(event) => setSort(event.target.value)}
        disabled={isPending}
        className="h-9 w-auto text-sm"
      >
        {TENANT_SORT_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {tenantSortLabels(d)[value]}
          </option>
        ))}
      </Select>
    </label>
  );
}

"use client";

import { ArrowDownUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

/**
 * Wybór porządku listy — najemców, dokumentów i każdej innej, która go dostanie.
 *
 * Wybór siedzi w URL-u, jak filtry przy nieruchomościach: widok da się wysłać
 * linkiem, cofnąć przyciskiem wstecz i odświeżyć bez utraty ustawienia,
 * a sortuje serwer — klient nie dostaje listy tylko po to, żeby ją przełożyć.
 */
export function ListSort<T extends string>({
  options,
  labels,
  defaultValue,
  ariaLabel,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  /** Porządek domyślny — nie trafia do adresu, żeby go nie zaśmiecać. */
  defaultValue: T;
  ariaLabel: string;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setSort(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === defaultValue) next.delete("sort");
    else next.set("sort", value);

    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  const current = searchParams.get("sort");

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <ArrowDownUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="shrink-0">{d.panel.common.sort}</span>
      <Select
        aria-label={ariaLabel}
        value={current && (options as readonly string[]).includes(current) ? current : defaultValue}
        onChange={(event) => setSort(event.target.value)}
        disabled={isPending}
        className="h-9 w-auto text-sm"
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </Select>
    </label>
  );
}

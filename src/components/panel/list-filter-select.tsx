"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";

/**
 * Filtr listy jednym polem wyboru — np. umowy jednej nieruchomości.
 *
 * Wartość siedzi w URL-u obok frazy i porządku, jak w `ListSort`: widok da się
 * wysłać linkiem, a filtruje serwer. Pusta wartość to „wszystkie" i nie trafia
 * do adresu.
 */
export function ListFilterSelect({
  param,
  options,
  allLabel,
  ariaLabel,
}: {
  param: string;
  options: readonly { value: string; label: string }[];
  allLabel: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setValue(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(param, value);
    else next.delete(param);

    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  const current = searchParams.get(param) ?? "";

  return (
    <Select
      aria-label={ariaLabel}
      value={options.some((option) => option.value === current) ? current : ""}
      onChange={(event) => setValue(event.target.value)}
      disabled={isPending}
      className="sm:w-60"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

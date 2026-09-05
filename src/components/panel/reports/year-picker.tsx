"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

/** Wybór roku obrotowego. Stan w URL-u, żeby raport dało się wysłać linkiem. */
export function YearPicker({ years, selected }: { years: number[]; selected: number }) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      aria-label={d.panel.panelMisc.yearPicker}
      value={selected}
      disabled={isPending}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams);
        next.set("rok", event.target.value);
        startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
      }}
      className="w-32"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </Select>
  );
}

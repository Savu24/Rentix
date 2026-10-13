"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

/**
 * Filtr listy jako przełącznik segmentowy (redesign/_generator/lib.mjs,
 * `segmented`); na telefonie przewijany rząd „chipów".
 *
 * Wartość siedzi w URL-u jak w pozostałych filtrach: widok da się odświeżyć,
 * wysłać linkiem i cofnąć, a filtruje serwer. Pierwsza opcja to stan
 * domyślny i nie trafia do adresu.
 */
export function SegmentedFilter({
  param,
  options,
  ariaLabel,
}: {
  param: string;
  /** `shortLabel` zastępuje etykietę na telefonie, gdy pełna się nie mieści. */
  options: readonly { value: string; label: string; shortLabel?: string }[];
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const fallback = options[0]?.value ?? "";
  const current = searchParams.get(param) ?? fallback;

  function select(value: string) {
    const next = new URLSearchParams(searchParams);
    // Inny filtr to inna lista — numer strony ze starej nie ma tu znaczenia.
    next.delete("page");
    if (value && value !== fallback) next.set(param, value);
    else next.delete(param);

    const queryString = next.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={isPending}
      className={cn(
        // Telefon: chipy w jednym przewijanym rzędzie, bez zawijania.
        "-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]",
        // Desktop: jedna płytka z wysuniętym segmentem.
        "lg:mx-0 lg:w-fit lg:gap-0 lg:overflow-visible lg:rounded-[9px] lg:bg-surface-alt lg:p-[3px]",
      )}
    >
      {options.map((option) => {
        const active = option.value === current;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(option.value)}
            className={cn(
              "h-[34px] shrink-0 rounded-full px-3.5 text-[13.5px] font-[550] whitespace-nowrap transition-colors",
              "lg:h-[30px] lg:rounded-[7px] lg:px-3 lg:text-[13px]",
              active
                ? "bg-fg text-bg lg:bg-surface lg:text-fg lg:shadow-btn"
                : "border border-border-strong bg-surface text-fg lg:border-0 lg:bg-transparent lg:text-muted lg:hover:text-fg",
            )}
          >
            {option.shortLabel ? (
              <>
                <span className="lg:hidden">{option.shortLabel}</span>
                <span className="hidden lg:inline">{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}

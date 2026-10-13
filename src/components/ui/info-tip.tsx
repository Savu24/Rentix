import { Info } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Ikona „i" z podpowiedzią (redesign/01-design-system.svg, `tooltip`).
 *
 * Zdania objaśniające nie stoją w panelu na wierzchu — siedzą tutaj,
 * domyślnie ukryte. Podpowiedź wychodzi po najechaniu myszą i po fokusie
 * z klawiatury (na telefonie: po dotknięciu ikony), więc nie trzeba do niej
 * JavaScriptu. Czytnik ekranu dostaje tekst przez `aria-describedby`.
 */
export function InfoTip({
  label,
  children,
  align = "start",
  className,
}: {
  /** Nazwa przycisku dla czytnika ekranu („Jak liczymy raport"). */
  label: string;
  children: React.ReactNode;
  /** Krawędź, od której rozwija się dymek — przy prawym brzegu ekranu `end`. */
  align?: "start" | "end";
  className?: string;
}) {
  const id = useId();

  return (
    <span className={cn("group relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="flex size-6 items-center justify-center rounded-full text-subtle transition-colors hover:text-fg"
      >
        <Info className="size-[18px]" strokeWidth={1.9} aria-hidden />
      </button>
      <span
        role="tooltip"
        id={id}
        className={cn(
          // Ukryty dymek nie zajmuje miejsca (`hidden`), inaczej przy prawej
          // krawędzi telefonu poszerzałby stronę o swoją szerokość.
          "pointer-events-none absolute top-full z-50 mt-2 hidden w-max max-w-80",
          "rounded-control bg-fg px-3 py-2 text-left text-[12.5px] leading-[18px] font-medium tracking-normal text-bg shadow-float",
          "group-hover:block group-focus-within:block",
          // Telefon: dymek na całą szerokość między marginesami, pod ikoną.
          "max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:mt-8 max-sm:w-auto max-sm:max-w-none",
          align === "start" ? "-left-1" : "-right-1",
        )}
      >
        {children}
      </span>
    </span>
  );
}

import { cn } from "@/lib/utils";

/**
 * Znak Rentiksa: litera R w bursztynowym kwadracie, ten sam rysunek co ikona
 * na ekranie głównym telefonu.
 *
 * Kształt wchodzi maską CSS, a nie zwykłym obrazkiem. Kolory znaku odwracają się
 * między motywami (jasny: ciemna zieleń na bursztynie, ciemny: bursztyn na
 * przygaszonym brązie), więc wklejona bitmapa miałaby w jednym z nich za mały
 * kontrast. Maska bierze kolor z tokenu, czyli idzie za motywem sama.
 */
const MASK = {
  maskImage: "url(/logo-mark.png)",
  WebkitMaskImage: "url(/logo-mark.png)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
} as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[9px] bg-highlight",
        "h-8 w-8",
        className,
      )}
      aria-hidden
    >
      {/* Odstęp wokół litery jest już wrysowany w maskę, więc kwadrat wypełniamy
          w całości — inaczej znak zrobiłby się dwa razy za mały. */}
      <span className="h-full w-full bg-highlight-text" style={MASK} />
    </span>
  );
}

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={size === "sm" ? "h-7 w-7" : "h-8.5 w-8.5"} />
      {/* „ON" na zielono, jak zapalona kontrolka włączonego urządzenia. Kolor
          bierzemy z tokenu `good` (tego samego, którym oznaczamy opłacone
          rachunki), więc odwraca się razem z motywem i nie gaśnie na ciemnym
          tle. Wewnątrz jednego <span>, bez odstępu, żeby czytnik ekranu
          przeczytał jedną nazwę, a nie „Rentix O N". */}
      <span
        className={cn(
          "font-semibold tracking-[-0.005em] text-fg",
          size === "sm" ? "text-[15px]" : "text-[18px]",
        )}
      >
        Rentix<span className="text-good">ON</span>
      </span>
    </span>
  );
}

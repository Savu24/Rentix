import { cn } from "@/lib/utils";

/**
 * Znak Rentiksa: litera R w bursztynowym kwadracie, ten sam rysunek co ikona
 * na ekranie głównym telefonu.
 *
 * Kształt wchodzi maską CSS, a nie zwykłym obrazkiem. Kolory znaku biorą się
 * z tokenów `highlight` i `highlight-text` (ciemna zieleń na bursztynie w obu
 * motywach), więc zmiana marki w globals.css nie wymaga podmiany bitmapy.
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
  onDark = false,
}: {
  className?: string;
  size?: "sm" | "md";
  /** Na ciemnozielonym pasku bocznym: biały napis i jasna zieleń „ON". */
  onDark?: boolean;
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
          "font-semibold tracking-[-0.005em]",
          onDark ? "font-display text-side-active-ink" : "text-fg",
          onDark ? "text-[17px]" : size === "sm" ? "text-[15px]" : "text-[18px]",
        )}
      >
        Rentix<span className={onDark ? "text-side-on" : "text-good"}>ON</span>
      </span>
    </span>
  );
}

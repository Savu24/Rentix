import { cn } from "@/lib/utils";

/** Znak Rentiksa — dach w bursztynowym kwadracie, jak w design systemie. */
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--highlight-text)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[17px] w-[17px]"
      >
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
      </svg>
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
      <span
        className={cn(
          "font-semibold tracking-[-0.005em] text-fg",
          size === "sm" ? "text-[15px]" : "text-[18px]",
        )}
      >
        Rentix
      </span>
    </span>
  );
}

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Wymiary z redesign/_generator/lib.mjs (`button`): wysokość 32 / 40 / 48,
  promień 8, etykieta 13–14 px w wadze 550, ikona 16–18 px, odstęp 8.
  Wyłączony przycisk nie blednie, tylko przechodzi na zagłębione tło
  z wygaszonym tekstem — tak samo w obu motywach.
*/
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-[550]",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-alt",
    "disabled:text-subtle disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        /** Główna akcja — pełna zieleń butelkowa. Jedna na ekran. */
        primary: "bg-accent text-accent-contrast shadow-btn hover:bg-accent-strong",
        /** Akcja drugorzędna — powierzchnia z mocniejszym obrysem. */
        secondary: "border border-border-strong bg-surface text-fg shadow-btn hover:bg-hover",
        /** Wariant z obrysem w kolorze tekstu — nawigacja marketingowa. */
        outline: "border border-fg bg-transparent text-fg hover:bg-hover",
        /** Miękka zieleń — akcja ważna, ale nie główna (np. „Wyślij najemcy"). */
        soft: "bg-accent-soft text-accent hover:bg-accent-soft/70",
        /** CTA terakotowe — rzadko, do rzeczy naprawdę ważnych. */
        accent2: "bg-accent2 text-on-color shadow-btn hover:bg-accent2-strong",
        /** CTA na ciemnozielonym bloku — kontrastowy bursztyn. */
        highlight: "bg-highlight text-highlight-text shadow-btn hover:opacity-90",
        /** Akcja tekstowa (Anuluj, Wyczyść filtry). */
        ghost: "bg-transparent text-muted hover:bg-surface-alt hover:text-fg disabled:bg-transparent",
        /** Akcje destrukcyjne (usuwanie umowy, najemcy). */
        danger: "bg-bad text-on-color shadow-btn hover:bg-bad-ink dark:text-accent-contrast",
        /** Destrukcyjna, ale nie ostateczna (np. „Anuluj dokument" w karcie). */
        "danger-soft": "bg-bad-soft text-bad-ink hover:bg-bad-soft/70",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10 p-0",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderuje potomka zamiast <button> — np. <Link> ze stylem przycisku. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-medium",
    "transition-[background-color,border-color,color,opacity,transform] duration-150",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        /** Główna akcja — pełna zieleń butelkowa. */
        primary: "bg-accent text-accent-contrast hover:bg-accent-strong",
        /** Akcja drugorzędna — obrys w kolorze ramki. */
        secondary: "border border-border bg-transparent text-fg hover:bg-surface-alt",
        /** Wariant z obrysem w kolorze tekstu — nawigacja marketingowa. */
        outline: "border border-fg bg-transparent text-fg hover:bg-surface-alt",
        /** CTA terakotowe — rzadko, do rzeczy naprawdę ważnych. */
        accent2: "bg-accent2 text-white hover:bg-accent2-strong",
        /** CTA na ciemnozielonym bloku — kontrastowy bursztyn. */
        highlight: "bg-highlight text-highlight-text hover:opacity-90",
        ghost: "bg-transparent text-fg hover:bg-surface-alt",
        /** Akcje destrukcyjne (usuwanie umowy, najemcy). */
        danger: "bg-bad text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3.5 text-[13.5px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15.5px]",
        icon: "h-9 w-9 p-0",
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

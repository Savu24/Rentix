"use client";

import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Sekcja długiego formularza (redesign/05-nieruchomosc-formularz.svg):
 * widać tylko to, co niezbędne, reszta siedzi w zwiniętych kartach
 * z jednolinijkowym podsumowaniem.
 *
 * Zwinięta sekcja chowa pola atrybutem `hidden`, a nie odmontowuje ich —
 * react-hook-form dalej zna ich wartości i wysyła je przy zapisie.
 * Gdy w środku pojawi się błąd walidacji (`aria-invalid`), sekcja otwiera
 * się sama: błąd schowany w zwiniętej karcie wyglądałby jak formularz,
 * który bez powodu nie chce się zapisać.
 */
export function FormSection({
  title,
  icon: Icon,
  summary,
  defaultOpen = false,
  collapsible = true,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** Jedna linijka po prawej w zwiniętym nagłówku, np. „Nieruchomość własna". */
  summary?: string | null;
  defaultOpen?: boolean;
  /** Sekcja zawsze otwarta — dane podstawowe. */
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen || !collapsible);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const bodyId = React.useId();

  // Bez tablicy zależności: błędy przychodzą z zewnątrz (zapis, walidacja),
  // a sprawdzenie DOM-u jest tańsze niż przekazywanie listy pól do każdej sekcji.
  // Pętli nie ma: `setOpen(true)` wołamy tylko przy zamkniętej sekcji.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (!open && bodyRef.current?.querySelector('[aria-invalid="true"]')) setOpen(true);
  });

  return (
    <section className="rounded-tile border border-border bg-surface lg:rounded-card">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-16 w-full items-center gap-3 rounded-tile px-4 text-left lg:rounded-card lg:px-6"
        >
          {Icon ? <Icon className="size-[18px] shrink-0 text-subtle" aria-hidden /> : null}
          <span className="flex-1 text-[15px] font-semibold text-fg">{title}</span>
          {summary && !open ? (
            <span className="hidden truncate text-[13.5px] text-subtle sm:block">{summary}</span>
          ) : null}
          <ChevronDown
            className={cn("size-[18px] shrink-0 text-muted transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : (
        <h2 className="flex items-center gap-3 px-4 pt-5 text-[17px] font-[650] text-fg lg:px-7 lg:pt-6">
          {Icon ? <Icon className="size-[18px] shrink-0 text-subtle" aria-hidden /> : null}
          {title}
        </h2>
      )}

      <div
        ref={bodyRef}
        id={bodyId}
        hidden={!open}
        className={cn("flex flex-col gap-4 px-4 pb-5 lg:px-7 lg:pb-7", collapsible ? "pt-1" : "pt-4")}
      >
        {children}
      </div>
    </section>
  );
}

/** Kroki kreatora po prawej stronie formularza (`stepper` w projekcie). */
export function Stepper({
  label,
  steps,
  active,
}: {
  label: string;
  steps: readonly string[];
  /** Indeks bieżącego kroku, od zera. */
  active: number;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold text-subtle">{label}</p>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const done = index < active;
          const current = index === active;

          return (
            <li key={step} className="flex flex-col">
              <span className="flex items-center gap-3" aria-current={current ? "step" : undefined}>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-[650]",
                    done || current ? "bg-accent text-accent-contrast" : "bg-surface-alt text-subtle",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={2.2} aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    current ? "font-semibold text-fg" : done ? "font-medium text-fg" : "font-medium text-subtle",
                  )}
                >
                  {step}
                </span>
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cn("my-1 ml-[13px] h-4 w-0.5 rounded-full", done ? "bg-accent" : "bg-border-strong")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

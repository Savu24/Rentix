"use client";

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Okno modalne (redesign/_generator/lib.mjs, `modal` i `sheet`).
 *
 * Natywny `<dialog>` z `showModal()`: przeglądarka sama zamyka fokus w oknie,
 * obsługuje Esc i rysuje warstwę pod spodem (`::backdrop`). Na desktopie
 * okno na środku z promieniem 16, na telefonie arkusz od dołu ekranu.
 *
 * Sterowane z zewnątrz: `open` otwiera, `onClose` dostaje każdą próbę
 * zamknięcia — krzyżyk, Esc i kliknięcie w tło.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Jedna linia pod tytułem: czego okno dotyczy („R 3/10/2026, Zofia Wrzesińska"). */
  description?: string;
  /** Etykieta krzyżyka dla czytnika ekranu, ze słownika („Zamknij"). */
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // `showModal()` daje fokus pierwszemu przyciskowi, czyli krzyżykowi.
      // Ktoś, kto otwiera formularz, chce od razu pisać — fokus idzie do pola.
      dialog
        .querySelector<HTMLElement>(
          "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])",
        )
        ?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc — przeglądarka zamknęłaby okno sama, ale stan trzyma rodzic.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Kliknięcie w tło trafia w sam element <dialog>, nie w jego treść.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-[20px] bg-surface p-0 text-fg shadow-float",
        "backdrop:bg-scrim sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-[560px] sm:rounded-tile",
        "max-h-[92dvh] overflow-y-auto",
        className,
      )}
    >
      {open ? (
        <div className="flex flex-col">
          <span className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-border-strong sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-6">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={titleId} className="r-display text-xl leading-7 text-fg">
                {title}
              </h2>
              {description ? <p className="text-sm text-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-muted transition-colors hover:text-fg sm:rounded-control"
            >
              <X className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

/** Treść okna z odstępami z projektu. */
export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4 px-5 py-5 sm:px-7", className)} {...props} />;
}

/** Stopka z akcjami po prawej, oddzielona linią. Na telefonie przyciski na całą szerokość. */
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2.5 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6",
        "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4",
        className,
      )}
      {...props}
    />
  );
}

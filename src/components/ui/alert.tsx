import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Alert = jedno zdanie + ewentualnie akcja (redesign/_generator/lib.mjs,
  `alertBar`): miękkie tło tonu, tekst w ciemnym odcieniu tonu, ikona
  w pełnym kolorze tonu, promień 10.
*/
const TONES = {
  info: { box: "bg-info-soft text-info-ink", icon: Info, iconClass: "text-info" },
  success: { box: "bg-good-soft text-good-ink", icon: CheckCircle2, iconClass: "text-good" },
  warning: { box: "bg-warn-soft text-warn-ink", icon: AlertTriangle, iconClass: "text-warn" },
  error: { box: "bg-bad-soft text-bad-ink", icon: AlertCircle, iconClass: "text-bad" },
} as const;

export type AlertTone = keyof typeof TONES;

/** Komunikat na poziomie formularza lub strony (błąd zapisu, potwierdzenie). */
export function Alert({
  tone = "info",
  action,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: AlertTone;
  /** Akcja przy prawej krawędzi, np. link „Uzupełnij". */
  action?: React.ReactNode;
}) {
  const { box, icon: Icon, iconClass } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-alert px-4 py-3.5 text-sm leading-5 font-medium",
        box,
        className,
      )}
      {...props}
    >
      <Icon className={cn("size-[18px] shrink-0", iconClass)} strokeWidth={1.9} aria-hidden />
      {/* Na telefonie akcja schodzi pod zdanie — obok ścisnęłaby je do
          kolumny po jednym słowie w wierszu. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">{children}</div>
        {action ? (
          <div className="flex shrink-0 items-center gap-1.5 font-semibold">
            {action}
            <ArrowRight className="size-[18px]" strokeWidth={1.9} aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}

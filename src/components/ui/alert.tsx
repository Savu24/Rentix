import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const TONES = {
  info: { box: "bg-surface-alt text-fg", icon: Info, iconClass: "text-muted" },
  success: { box: "bg-good-soft text-fg", icon: CheckCircle2, iconClass: "text-good" },
  warning: { box: "bg-warn-soft text-fg", icon: AlertTriangle, iconClass: "text-warn" },
  error: { box: "bg-bad-soft text-fg", icon: AlertTriangle, iconClass: "text-bad" },
} as const;

export type AlertTone = keyof typeof TONES;

/** Komunikat na poziomie formularza lub strony (błąd zapisu, potwierdzenie). */
export function Alert({
  tone = "info",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: AlertTone }) {
  const { box, icon: Icon, iconClass } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-control px-3.5 py-3 text-[13.5px]",
        box,
        className,
      )}
      {...props}
    >
      <Icon className={cn("mt-px h-4 w-4 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

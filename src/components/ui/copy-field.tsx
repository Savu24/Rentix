"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Etykieta, wartość i przycisk kopiowania (redesign/21-portal-najemcy-*.svg,
 * „Jak zapłacić"). Numer rachunku przepisywany z ekranu to najczęstsza
 * literówka w przelewie, więc wartość da się skopiować jednym dotknięciem.
 */
export function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
  className,
}: {
  label: string;
  value: string;
  /** „Kopiuj: Numer rachunku" — nazwa przycisku dla czytnika ekranu. */
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Brak dostępu do schowka (stara przeglądarka, brak HTTPS) — wartość
      // i tak stoi na ekranie i da się ją zaznaczyć ręcznie.
    }
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-card bg-hover px-4 py-3", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-subtle">{label}</span>
        <span className="font-mono text-[14.5px] font-semibold break-words text-fg select-all">{value}</span>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabel}
        className="flex size-9 shrink-0 items-center justify-center rounded-control text-accent transition-colors hover:bg-accent-soft"
      >
        {copied ? <Check className="size-[18px]" aria-hidden /> : <Copy className="size-[18px]" aria-hidden />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </div>
  );
}

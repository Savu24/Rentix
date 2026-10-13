"use client";

import { Check, Circle } from "lucide-react";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { passwordChecks, type PasswordRule } from "@/lib/validations/auth";

const RULES: PasswordRule[] = ["length", "upper", "lower", "digit"];

/**
 * Wymagania wobec hasła jako lista z ptaszkami (redesign/README: „lista
 * kontrolna, a nie zdanie"). Każda pozycja ma ikonę i tekst, nie sam kolor.
 * Warunki liczy `passwordChecks` — te same, co walidacja na serwerze.
 */
export function PasswordChecklist({ value, id, className }: { value: string; id?: string; className?: string }) {
  const { d } = useI18n();
  const checks = passwordChecks(value);

  return (
    <ul id={id} className={cn("grid grid-cols-2 gap-x-4 gap-y-1.5", className)}>
      {RULES.map((rule) => {
        const ok = checks[rule];
        return (
          <li
            key={rule}
            className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", ok ? "text-good-ink" : "text-subtle")}
          >
            {ok ? (
              <Check className="size-3.5 shrink-0 text-good" strokeWidth={2.4} aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            )}
            {d.auth.passwordRules[rule]}
          </li>
        );
      })}
    </ul>
  );
}

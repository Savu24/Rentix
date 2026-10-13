"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Pole hasła z przyciskiem „pokaż" (redesign/22-logowanie-*.svg, ikona oka).
 * Hasło wpisywane na telefonie bez podglądu to najczęstszy powód nieudanego
 * logowania, a zmiana `type` niczego nie zdradza poza ekranem użytkownika.
 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const { d } = useI18n();
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? d.auth.login.hidePassword : d.auth.login.showPassword}
        aria-pressed={visible}
        disabled={props.disabled}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-subtle transition-colors hover:text-fg"
      >
        {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
      </button>
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { useI18n } from "@/lib/i18n/client";

/**
 * Logo Google rysowane wprost w SVG.
 *
 * Wytyczne Google wymagają czterech oryginalnych kolorów — ikona z zestawu
 * `lucide` (jednokolorowa) tego warunku nie spełnia, a plik z CDN dokładałby
 * zewnętrzne żądanie na stronie logowania.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Logowanie i rejestracja jednym przyciskiem — po stronie Google to ta sama
 * operacja, a konto z organizacją zakłada się przy pierwszym wejściu.
 *
 * Bez `redirect: false`: przepływ OAuth i tak wychodzi poza aplikację, więc nie
 * ma czego przechwytywać w formularzu. Błędy wracają na `/logowanie?error=`,
 * bo tak wskazuje `pages.error` w konfiguracji NextAuth.
 */
export function GoogleButton({
  returnTo,
  label,
}: {
  returnTo?: string;
  /** Rejestracja podaje własny napis; bez niego bierzemy „zaloguj się". */
  label?: string;
}) {
  const { d } = useI18n();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      block
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { redirectTo: returnTo ?? ROUTES.ownerDashboard });
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <GoogleMark />
      )}
      {label ?? d.auth.login.google}
    </Button>
  );
}

/** Poziomy separator „albo" między logowaniem Google a formularzem. */
export function AuthDivider() {
  const { d } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-xs uppercase tracking-[0.08em] text-muted">{d.auth.login.divider}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

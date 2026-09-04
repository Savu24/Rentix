import type { Metadata } from "next";
import Link from "next/link";

import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { googleEnabled } from "@/lib/auth/google";
import { ROUTES } from "@/lib/auth/routes";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Załóż konto",
  description: "Załóż darmowe konto Rentix. Pierwsze 20 najemców za darmo.",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="r-display text-[30px] leading-tight text-fg">
          Załóż darmowe konto
        </h1>
        <p className="text-sm text-muted">
          Masz już konto?{" "}
          <Link
            href={ROUTES.login}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Zaloguj się
          </Link>
          .
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleButton label="Załóż konto przez Google" />
          <AuthDivider />
        </>
      ) : null}

      <RegisterForm />

      <p className="text-xs leading-relaxed text-muted">
        Zakładając konto akceptujesz regulamin i politykę prywatności Rentix.
        Bez karty kredytowej. Pierwsze 20 najemców za darmo, na zawsze.
      </p>
    </div>
  );
}

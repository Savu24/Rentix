import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Załóż konto",
  description: "Załóż darmowe konto Rentix — pierwsze 20 najemców za darmo.",
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

      <RegisterForm />

      <p className="text-xs leading-relaxed text-muted">
        Zakładając konto akceptujesz regulamin i politykę prywatności Rentix.
        Bez karty kredytowej — pierwsze 20 najemców za darmo, na zawsze.
      </p>
    </div>
  );
}

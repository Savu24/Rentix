import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do panelu Rentix.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ powrot?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Przyjmujemy wyłącznie ścieżki względne — bez tego `?powrot=https://...`
  // zamieniłby logowanie w otwarte przekierowanie na obcą domenę.
  const returnTo =
    params.powrot?.startsWith("/") && !params.powrot.startsWith("//")
      ? params.powrot
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="r-display text-[30px] leading-tight text-fg">
          Zaloguj się
        </h1>
        <p className="text-sm text-muted">
          Nie masz jeszcze konta?{" "}
          <Link
            href={ROUTES.register}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Załóż je za darmo
          </Link>
          .
        </p>
      </div>

      <LoginForm returnTo={returnTo} initialErrorCode={params.error} />
    </div>
  );
}

import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { googleEnabled } from "@/lib/auth/google";
import { publicRoutes, RETURN_PARAMS } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";

/** Parametry adresu, jakie strona logowania przyjmuje w każdej wersji krajowej. */
export type LoginSearchParams = Record<string, string | string[] | undefined>;

export function LoginView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: LoginSearchParams;
}) {
  const t = getDictionary(locale).auth.login;
  const routes = publicRoutes(locale);

  /*
    Adres powrotu nazywa się inaczej w każdej wersji (`powrot`, `return`), więc
    czytamy oba: link skopiowany z polskiej strony ma zadziałać także wtedy, gdy
    ktoś podmienił w nim prefiks kraju.

    Przyjmujemy wyłącznie ścieżki względne — bez tego `?powrot=https://…`
    zamieniłby logowanie w otwarte przekierowanie na obcą domenę.
  */
  const rawReturn = RETURN_PARAMS.map((name) => searchParams[name]).find(
    (value): value is string => typeof value === "string",
  );
  const returnTo =
    rawReturn?.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : undefined;

  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  return (
    <AuthShell locale={locale}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="r-display text-[30px] leading-tight text-fg">{t.heading}</h1>
          <p className="text-sm text-muted">
            {t.noAccount}{" "}
            <Link
              href={routes.register}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              {t.registerLink}
            </Link>
            .
          </p>
        </div>

        {googleEnabled ? (
          <>
            <GoogleButton returnTo={returnTo} />
            <AuthDivider />
          </>
        ) : null}

        <LoginForm returnTo={returnTo} initialErrorCode={error} />
      </div>
    </AuthShell>
  );
}

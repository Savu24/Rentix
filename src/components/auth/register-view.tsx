import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";
import { googleEnabled } from "@/lib/auth/google";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";

export function RegisterView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).auth.register;
  const routes = publicRoutes(locale);

  return (
    <AuthShell locale={locale}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="r-display text-[30px] leading-tight text-fg">{t.heading}</h1>
          <p className="text-sm text-muted">
            {t.hasAccount}{" "}
            <Link
              href={routes.login}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              {t.loginLink}
            </Link>
            .
          </p>
        </div>

        {googleEnabled ? (
          <>
            <GoogleButton label={t.google} />
            <AuthDivider />
          </>
        ) : null}

        <RegisterForm />

        <p className="text-xs leading-relaxed text-muted">{t.terms}</p>
      </div>
    </AuthShell>
  );
}

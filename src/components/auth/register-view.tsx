import { Check } from "lucide-react";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";
import { Badge } from "@/components/ui/badge";
import { googleEnabled } from "@/lib/auth/google";
import { publicRoutes } from "@/lib/auth/routes";
import { getDictionary, type Locale } from "@/lib/i18n";

export function RegisterView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).auth.register;
  const routes = publicRoutes(locale);

  return (
    <AuthShell locale={locale}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <h1 className="r-display text-[34px] leading-10 tracking-[-0.6px] text-fg">{t.heading}</h1>
          <Badge tone="good" icon={Check}>
            {t.freePlan}
          </Badge>
        </div>

        {googleEnabled ? (
          <>
            <GoogleButton label={t.google} />
            <AuthDivider />
          </>
        ) : null}

        <RegisterForm />

        <p className="text-center text-[13px] leading-relaxed text-subtle">{t.terms}</p>

        <p className="text-center text-sm text-muted">
          {t.hasAccount}{" "}
          <Link href={routes.login} className="font-semibold text-accent underline-offset-4 hover:underline">
            {t.loginLink}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

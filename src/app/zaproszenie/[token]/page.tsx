import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  InvitationAcceptButton,
  InvitationCreateAccountForm,
} from "@/components/auth/invitation-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { loginPathWithReturn, publicRoutes } from "@/lib/auth/routes";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { findInvitation } from "@/lib/invitations/service";
import { invitationPath } from "@/lib/invitations/tokens";
import { membershipRoleLabels } from "@/lib/validations/team";

import { acceptAsCurrentUser, acceptWithNewAccount } from "./actions";

/**
 * Przyjęcie zaproszenia.
 *
 * Adres bez prefiksu kraju, w odróżnieniu od logowania i rejestracji. Język
 * bierze się tu z organizacji, która zaprasza, a nie z przeglądarki gościa:
 * to jej zespół albo jej najem, więc zaproszenie ma brzmieć tak samo jak
 * wiadomość, z której ktoś w link kliknął. Drzewo tras per kraj dawałoby dwa
 * różne adresy dla tego samego tokenu.
 */

export const metadata: Metadata = {
  title: getDictionary(DEFAULT_LOCALE).auth.invitation.metaTitle,
  // Link jednorazowy nie ma czego szukać w wyszukiwarce.
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ token: string }> };

export default async function InvitationPage({ params }: Params) {
  const { token } = await params;
  const lookup = await findInvitation(token);

  // Zaproszenia nie da się przyjąć — kraju organizacji też nie znamy, bo
  // `findInvitation` nie ujawnia niczego przed sprawdzeniem terminu.
  if (lookup.status !== "OK") {
    const d = getDictionary(DEFAULT_LOCALE);
    const message = {
      NOT_FOUND: d.auth.invitation.errors.notFound,
      EXPIRED: d.auth.invitation.errors.expired,
      ACCEPTED: d.auth.invitation.errors.accepted,
    }[lookup.status];

    return (
      <Shell locale={DEFAULT_LOCALE}>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Alert tone="error">{message}</Alert>
            {/* Jedyne sensowne wyjście z każdego z tych trzech stanów: kto
                konto ma, ten się loguje; kto nie ma, prosi o nowy link. */}
            <Button asChild size="sm" variant="secondary">
              <Link href={publicRoutes(DEFAULT_LOCALE).login}>{d.auth.login.submit}</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const invitation = lookup.invitation;
  const locale = isLocale(invitation.organizationLocale)
    ? invitation.organizationLocale
    : DEFAULT_LOCALE;

  const d = getDictionary(locale);
  const t = d.auth.invitation;

  const isTeam = invitation.kind === "TEAM";
  const heading = isTeam ? t.team.heading : t.tenant.heading;
  const lead = isTeam
    ? fill(t.team.lead, {
        organization: invitation.organizationName,
        role: membershipRoleLabels(d)[invitation.role ?? "MEMBER"],
      })
    : fill(t.tenant.lead, { organization: invitation.organizationName });

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

  return (
    <Shell locale={locale}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="r-display text-[22px] leading-tight text-fg">{heading}</h1>
            <p className="text-sm text-muted">{lead}</p>
          </div>

          <dl className="flex flex-col gap-0.5 rounded-control bg-surface-alt px-3.5 py-3 text-sm">
            <dt className="text-xs text-muted">{t.email}</dt>
            <dd className="font-medium text-fg">{invitation.email}</dd>
          </dl>

          {sessionEmail === null ? (
            invitation.hasAccount ? (
              // Konto istnieje, ale nikt nie jest zalogowany. Nie zakładamy
              // drugiego na ten sam adres i nie przyjmujemy zaproszenia bez
              // hasła — najpierw logowanie, z adresem powrotu tutaj.
              <div className="flex flex-col gap-3">
                <h2 className="text-[15px] font-semibold text-fg">{t.existing.heading}</h2>
                <p className="text-sm text-muted">
                  {fill(t.existing.lead, { email: invitation.email })}
                </p>
                <Button asChild>
                  <Link href={loginPathWithReturn(locale, invitationPath(token))}>
                    {t.existing.login}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-fg">{t.create.heading}</h2>
                  <p className="mt-0.5 text-sm text-muted">{t.create.lead}</p>
                </div>
                <InvitationCreateAccountForm
                  action={acceptWithNewAccount.bind(null, token)}
                />
              </div>
            )
          ) : sessionEmail === invitation.email.toLowerCase() ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-fg">{t.ready.heading}</h2>
              <p className="text-sm text-muted">{fill(t.ready.lead, { email: sessionEmail })}</p>
              <InvitationAcceptButton action={acceptAsCurrentUser} token={token} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Alert tone="warning">{t.errors.wrongAccount}</Alert>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" size="sm">
                  {d.panel.shell.signOut}
                </Button>
              </form>
            </div>
          )}

          <p className="text-xs text-muted">
            {fill(t.expires, { date: formatDateIn(invitation.expiresAt, locale, "long") })}
          </p>
        </CardContent>
      </Card>
    </Shell>
  );
}

/**
 * Rama strony razem z dostawcą tłumaczeń.
 *
 * Formularz jest komponentem klienckim i czyta teksty przez `useI18n`, a ten
 * z korzenia aplikacji zna wyłącznie preferencję odwiedzającego — tutaj musi
 * obowiązywać kraj organizacji, która zaprasza.
 */
function Shell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale} dictionary={clientDictionary(locale)}>
      <AuthShell locale={locale}>{children}</AuthShell>
    </I18nProvider>
  );
}

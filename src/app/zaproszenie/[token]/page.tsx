import { ArrowRight, Check, Clock, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { loginPathWithReturn, publicRoutes } from "@/lib/auth/routes";
import { clientDictionary, getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { fill, formatDateIn } from "@/lib/i18n/format";
import { findInvitation } from "@/lib/invitations/service";
import { invitationPath } from "@/lib/invitations/tokens";
import { initials } from "@/lib/utils";
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
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-tile bg-bad-soft" aria-hidden>
            <Clock className="size-7 text-bad" strokeWidth={1.8} />
          </span>
          <h1 className="r-display text-[22px] leading-8 text-fg" role="alert">
            {message}
          </h1>
          {/* Jedyne sensowne wyjście z każdego z tych trzech stanów: kto
              konto ma, ten się loguje; kto nie ma, prosi o nowy link. */}
          <Button asChild variant="secondary">
            <Link href={publicRoutes(DEFAULT_LOCALE).login}>{d.auth.login.submit}</Link>
          </Button>
        </div>
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

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

  return (
    <Shell locale={locale}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-2">
          <p className="text-[13.5px] font-semibold text-muted">{invitation.organizationName}</p>
          <h1 className="r-display text-[30px] leading-9 tracking-[-0.5px] text-fg">{heading}</h1>
          {isTeam ? (
            <Badge tone="accent" icon={Users}>
              {membershipRoleLabels(d)[invitation.role ?? "MEMBER"]}
            </Badge>
          ) : null}
        </div>

        {sessionEmail === null ? (
          invitation.hasAccount ? (
            // Konto istnieje, ale nikt nie jest zalogowany. Nie zakładamy
            // drugiego na ten sam adres i nie przyjmujemy zaproszenia bez
            // hasła — najpierw logowanie, z adresem powrotu tutaj.
            <div className="flex flex-col gap-4">
              <h2 className="sr-only">{t.existing.heading}</h2>
              <div className="flex items-center gap-3 rounded-card bg-surface-alt px-4 py-3.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent"
                  aria-hidden
                >
                  {initials(invitation.email)}
                </span>
                <span className="min-w-0 text-[14.5px] font-semibold [overflow-wrap:anywhere] text-fg">
                  {invitation.email}
                </span>
              </div>
              <Button asChild size="lg" block>
                <Link href={loginPathWithReturn(locale, invitationPath(token))}>
                  {t.existing.login}
                  <ArrowRight className="size-[18px]" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="sr-only">{t.create.heading}</h2>
              <InvitationCreateAccountForm action={acceptWithNewAccount.bind(null, token)} email={invitation.email} />
            </div>
          )
        ) : sessionEmail === invitation.email.toLowerCase() ? (
          <div className="flex flex-col items-start gap-4">
            <h2 className="sr-only">{t.ready.heading}</h2>
            <Badge tone="good" icon={Check} className="h-auto max-w-full py-1 whitespace-normal [overflow-wrap:anywhere]">
              {fill(t.ready.lead, { email: sessionEmail })}
            </Badge>
            <div className="w-full">
              <InvitationAcceptButton action={acceptAsCurrentUser} token={token} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Alert tone="warning">{t.errors.wrongAccount}</Alert>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                {d.panel.shell.signOut}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-[13px] text-subtle">
          {fill(t.expires, { date: formatDateIn(invitation.expiresAt, locale, "long") })}
        </p>
      </div>
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

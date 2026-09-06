"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { acceptInvitation, type AcceptFailure } from "@/lib/invitations/accept";
import { EMPTY_INVITATION_STATE, type InvitationFormState } from "@/lib/invitations/form-state";
import { findInvitation } from "@/lib/invitations/service";
import { getDictionary, localeContext } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { acceptInvitationSchema } from "@/lib/validations/team";

/**
 * Przyjęcie zaproszenia — Server Actions, nie API route.
 *
 * Powód jest jeden i konkretny: po założeniu konta trzeba je od razu zalogować,
 * a `signIn()` ustawia ciasteczko sesji, czego endpoint wołany `fetch`em
 * z przeglądarki nie zrobi bez przepychania hasła drugi raz. Akcja robi jedno
 * i drugie w tym samym żądaniu, a Next dokłada do formularza token akcji, więc
 * obca strona nie wyśle go za użytkownika.
 */

/** Język zaproszenia — kraj organizacji, która zaprasza. */
async function invitationLocale(token: string) {
  const lookup = await findInvitation(token);
  const locale =
    lookup.status === "OK" && isLocale(lookup.invitation.organizationLocale)
      ? lookup.invitation.organizationLocale
      : DEFAULT_LOCALE;

  return { lookup, locale, d: getDictionary(locale) };
}

/** Wspólne tłumaczenie odmowy dla obu akcji. */
function failureMessage(reason: AcceptFailure, t: ReturnType<typeof getDictionary>) {
  return t.auth.invitation.errors[
    (
      {
        NOT_FOUND: "notFound",
        EXPIRED: "expired",
        ACCEPTED: "accepted",
        WRONG_ACCOUNT: "wrongAccount",
        NEEDS_LOGIN: "needsLogin",
        WRONG_ACCOUNT_TYPE: "wrongAccountType",
        ALREADY_LINKED: "alreadyLinked",
      } as const
    )[reason]
  ];
}

/**
 * Zakłada konto z danych formularza i loguje.
 *
 * Adres nie jest polem formularza — bierze się z zaproszenia. Inaczej dałoby
 * się cudzym linkiem założyć konto na własny adres i wejść do organizacji.
 */
export async function acceptWithNewAccount(
  token: string,
  _previous: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const { lookup, locale, d } = await invitationLocale(token);

  if (lookup.status !== "OK") {
    return { error: d.auth.invitation.errors[lookupErrorKey(lookup.status)], fields: {} };
  }

  const parsed = acceptInvitationSchema(localeContext(locale)).safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (fields[issue.path.join(".") || "_"] ??= []).push(issue.message);
    }
    return { error: null, fields };
  }

  const result = await acceptInvitation(token, {
    kind: "new-account",
    name: parsed.data.name,
    password: parsed.data.password,
  });

  if (!result.ok) return { error: failureMessage(result.reason, d), fields: {} };

  /*
    `signIn` kończy się przekierowaniem (rzuca NEXT_REDIRECT), więc nic za nim
    już się nie wykona. Hasło mamy tu w pamięci z formularza — konto powstało
    przed chwilą, więc logowanie nie może się nie udać z powodu danych.
  */
  await signIn("credentials", {
    email: result.email,
    password: parsed.data.password,
    redirectTo: result.redirectTo,
  });

  return EMPTY_INVITATION_STATE;
}

/**
 * Przyjęcie zaproszenia przez osobę, która jest już zalogowana.
 *
 * Token idzie ukrytym polem formularza, a nie przez `bind`. Formularz i tak
 * musi zostać wysłany, a pole jest tu tańsze niż domknięcie serializowane przy
 * każdym renderze — token jest zresztą w adresie strony, więc niczego nie
 * ujawnia. Sprawdzeniem, czy wolno go przyjąć, zajmuje się `acceptInvitation`.
 */
export async function acceptAsCurrentUser(
  _previous: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const token = String(formData.get("token") ?? "");
  const { d } = await invitationLocale(token);
  const session = await auth();

  if (!session?.user?.id) {
    return { error: d.auth.invitation.errors.needsLogin, fields: {} };
  }

  const result = await acceptInvitation(token, { kind: "session", userId: session.user.id });

  if (!result.ok) return { error: failureMessage(result.reason, d), fields: {} };

  redirect(result.redirectTo);
}

/** Stany odczytu zaproszenia mają te same nazwy komunikatów co odmowy. */
function lookupErrorKey(status: "NOT_FOUND" | "EXPIRED" | "ACCEPTED") {
  return ({ NOT_FOUND: "notFound", EXPIRED: "expired", ACCEPTED: "accepted" } as const)[status];
}

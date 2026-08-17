import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { apiError } from "@/lib/api/response";

import { auth } from "./index";
import { ROUTES } from "./routes";

export type AppSession = Session & {
  user: NonNullable<Session["user"]>;
};

/** Sesja właściciela — dodatkowo gwarantuje, że `organizationId` nie jest NULL. */
export type OwnerSession = AppSession & {
  user: AppSession["user"] & { organizationId: string };
};

/**
 * Dla Server Componentów: wymusza zalogowanie, w przeciwnym razie przekierowuje
 * na logowanie z `?powrot=`, żeby po zalogowaniu wrócić tam, gdzie użytkownik był.
 */
export async function requireSession(returnTo?: string): Promise<AppSession> {
  const session = await auth();

  if (!session?.user) {
    const target = returnTo
      ? `${ROUTES.login}?powrot=${encodeURIComponent(returnTo)}`
      : ROUTES.login;
    redirect(target);
  }

  return session as AppSession;
}

/**
 * Dla Server Componentów panelu właściciela: wymusza rolę OWNER/ADMIN
 * i przypisanie do organizacji.
 */
export async function requireOwnerSession(returnTo?: string): Promise<OwnerSession> {
  const session = await requireSession(returnTo);

  if (session.user.role === "TENANT") {
    redirect(ROUTES.tenantDashboard);
  }

  if (!session.user.organizationId) {
    // Konto właściciela zawsze dostaje organizację przy rejestracji; brak
    // przypisania oznacza uszkodzone dane, a nie zwykły stan aplikacji.
    throw new Error(`Konto ${session.user.id} nie ma przypisanej organizacji.`);
  }

  return session as OwnerSession;
}

/**
 * Dla API routes: zwraca sesję albo gotową odpowiedź 401.
 *
 * Wołający sprawdza `if ("response" in result) return result.response;` — dzięki
 * temu każdy endpoint pilnuje autoryzacji sam, niezależnie od tego, co pokazuje UI.
 */
export async function getApiSession(): Promise<
  { session: AppSession } | { response: ReturnType<typeof apiError> }
> {
  const session = await auth();

  if (!session?.user) {
    return {
      response: apiError("UNAUTHORIZED", "Wymagane zalogowanie."),
    };
  }

  return { session: session as AppSession };
}

/**
 * Dla endpointów panelu właściciela: sesja + `organizationId`, którym zawęża
 * się każde zapytanie do bazy.
 *
 * Zwraca `organizationId` wprost, bo to jedyna wartość, której route'y
 * naprawdę potrzebują — i trudniej wtedy napisać zapytanie bez zawężenia.
 */
export async function requireApiOwner(): Promise<
  | { session: AppSession; organizationId: string }
  | { response: ReturnType<typeof apiError> }
> {
  const result = await getApiSession();
  if ("response" in result) return result;

  const { session } = result;

  if (session.user.role === "TENANT") {
    return {
      response: apiError("FORBIDDEN", "Ten zasób jest dostępny tylko dla właściciela konta."),
    };
  }

  if (!session.user.organizationId) {
    return {
      response: apiError("FORBIDDEN", "Konto nie ma przypisanej organizacji."),
    };
  }

  return { session, organizationId: session.user.organizationId };
}

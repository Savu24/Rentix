import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import type { MembershipRole } from "@/generated/prisma/enums";
import { apiError } from "@/lib/api/response";
import { organizationAllows } from "@/lib/billing/server";
import { requiredPlan, type PlanFeature } from "@/lib/billing/features";
import { fill } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import {
  getDictionary,
  localeContext,
  type ClientDictionary,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";
import { organizationLocale, requestLocale } from "@/lib/i18n/server";

import { auth } from "./index";
import { loginPathWithReturn, publicRoutes, ROUTES } from "./routes";

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
    // Adres logowania niesie kraj, więc niezalogowany trafia na formularz
    // w swoim języku, a nie na polski z angielskiej strony.
    const locale = await requestLocale();
    redirect(returnTo ? loginPathWithReturn(locale, returnTo) : publicRoutes(locale).login);
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

  /*
    Konto bez żadnego członkostwa (właśnie odebrano mu dostęp) zostaje przy
    organizacji z tokenu: layout panelu sprawdza członkostwo osobno i pokazuje
    wtedy ekran „nie masz już dostępu". Wyjątek rzucony tutaj zamieniłby ten
    ekran w błąd serwera.
  */
  const fromToken = session.user.organizationId;
  const organizationId = (await activeOrganizationId(session.user.id, fromToken)) ?? fromToken;

  if (!organizationId) {
    // Konto właściciela zawsze dostaje organizację przy rejestracji; brak
    // przypisania oznacza uszkodzone dane, a nie zwykły stan aplikacji.
    throw new Error(`Konto ${session.user.id} nie ma przypisanej organizacji.`);
  }

  /*
    Podmieniamy `organizationId` z tokenu na wybór z bazy, więc kilkadziesiąt
    stron panelu czyta `session.user.organizationId` jak dotąd i dostaje
    organizację, w której użytkownik właśnie pracuje — bez przepisywania ich
    wszystkich na nowe wywołanie.
  */
  return {
    ...session,
    user: { ...session.user, organizationId },
  } as OwnerSession;
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
/**
 * Kontekst językowy dla endpointów, które obsługują też najemcę.
 *
 * Najemca nie należy do organizacji właściciela, więc `organizationId` bywa
 * puste — wtedy zostaje preferencja z ciasteczka. Właściciel dostaje język
 * swojego konta, bo to on decyduje, w jakim kraju prowadzi najem.
 */
export async function sessionLocaleContext(session: AppSession) {
  const locale = session.user.organizationId
    ? await organizationLocale(session.user.organizationId)
    : await requestLocale();

  return localeContext(locale);
}

export type ApiOwnerContext = {
  session: AppSession;
  organizationId: string;
  /** Kraj konta — decyduje o języku odpowiedzi i o regułach walidacji. */
  locale: Locale;
  d: Dictionary;
  /** Gotowy kontekst do schematów walidacji — sekcje, po które sięgają schematy. */
  v: { locale: Locale; d: ClientDictionary };
};

export async function requireApiOwner(): Promise<
  ApiOwnerContext | { response: ReturnType<typeof apiError> }
> {
  const result = await getApiSession();
  if ("response" in result) return result;

  const { session } = result;

  // Bez organizacji nie ma jeszcze języka konta — bierzemy ten z żądania,
  // czyli z prefiksu strony, którą użytkownik miał przed sobą.
  if (session.user.role === "TENANT" || !session.user.organizationId) {
    const t = getDictionary(await requestLocale()).panel.api;

    return {
      response: apiError(
        "FORBIDDEN",
        session.user.role === "TENANT" ? t.ownerOnly : t.noOrganization,
      ),
    };
  }

  // Wartość z tokenu zostaje ostatnią deską ratunku: konto usunięte z zespołu
  // nie ma już żadnego członkostwa, a odpowiedź ma brzmieć „odebrano dostęp",
  // nie „brak organizacji".
  const fromToken = session.user.organizationId;
  const organizationId = (await activeOrganizationId(session.user.id, fromToken)) ?? fromToken;

  /*
    Token sesji żyje trzydzieści dni i niesie `organizationId` z chwili
    zalogowania — sam w sobie nie wie, że komuś odebrano dostęp. Odkąd
    w organizacji bywa więcej niż jedna osoba, to przestało być teoretyczne:
    bez tego sprawdzenia usunięty współpracownik czytałby dane konta jeszcze
    przez miesiąc. Jedno zapytanie po indeksie, wspólne dla całego żądania.
  */
  if (!(await membershipRole(session.user.id, organizationId))) {
    const t = getDictionary(await requestLocale()).panel.api;
    return { response: apiError("FORBIDDEN", t.accessRevoked) };
  }

  const locale = await organizationLocale(organizationId);

  return {
    // Sesja niesie tę samą organizację co `organizationId` obok — endpoint,
    // który sięgnie po `auth.session.user.organizationId`, nie ma dostać
    // wartości sprzed przełączenia.
    session: { ...session, user: { ...session.user, organizationId } },
    organizationId,
    locale,
    d: getDictionary(locale),
    v: localeContext(locale),
  };
}

/**
 * Endpoint funkcji bramkowanej planem.
 *
 * Nadbudowa nad `requireApiOwner`: dokłada jedno sprawdzenie i zwraca 403
 * z nazwą progu, od którego funkcja działa. Bramka siedzi w API, a nie tylko
 * w panelu — ukryty przycisk nie jest zabezpieczeniem, adres endpointu widać
 * w narzędziach przeglądarki.
 */
export async function requireApiFeature(
  feature: PlanFeature,
): Promise<ApiOwnerContext | { response: ReturnType<typeof apiError> }> {
  const result = await requireApiOwner();
  if ("response" in result) return result;

  if (!(await organizationAllows(result.organizationId, feature))) {
    return {
      response: apiError(
        "FORBIDDEN",
        fill(result.d.panel.api.planFeatureRequired, {
          plan: result.d.panel.shell.planNames[requiredPlan(feature)],
        }),
      ),
    };
  }

  return result;
}

export type UserOrganization = {
  id: string;
  name: string;
  role: MembershipRole;
};

/**
 * Organizacje, do których konto ma dostęp — rosnąco po dacie dołączenia.
 *
 * `cache` z Reacta zwija to do jednego zapytania na żądanie: pyta o to
 * i rozwiązanie bieżącej organizacji, i przełącznik w pasku górnym.
 */
export const userOrganizations = cache(
  async (userId: string): Promise<UserOrganization[]> => {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { role: true, organization: { select: { id: true, name: true } } },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
    }));
  },
);

/**
 * Organizacja, w której konto właśnie pracuje.
 *
 * Kolejność wyboru, od najmocniejszego wskazania:
 *
 * 1. wybór zapisany w koncie (`users.activeOrganizationId`) — o ile
 *    członkostwo nadal istnieje,
 * 2. organizacja z tokenu sesji, czyli ta z chwili zalogowania,
 * 3. pierwsza organizacja z listy.
 *
 * Wybór mieszka w bazie, a nie w tokenie, bo token żyje trzydzieści dni
 * i odświeża się najwyżej raz na dobę — przełączenie zapisane w nim
 * działałoby z opóźnieniem i osobno na każdym urządzeniu. Odczyt kosztuje
 * jedno zapytanie na żądanie, wspólne z listą organizacji.
 *
 * NULL znaczy „konto nie ma żadnego członkostwa": albo dopiero powstaje, albo
 * właśnie odebrano mu dostęp. Rozstrzyga to wołający — patrz `AccessRevoked`.
 */
export const activeOrganizationId = cache(
  async (userId: string, fromToken: string | null): Promise<string | null> => {
    const [organizations, user] = await Promise.all([
      userOrganizations(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
      }),
    ]);

    if (organizations.length === 0) return null;

    const belongs = (id: string | null | undefined) =>
      id != null && organizations.some((organization) => organization.id === id);

    if (belongs(user?.activeOrganizationId)) return user!.activeOrganizationId;
    if (belongs(fromToken)) return fromToken;

    return organizations[0]!.id;
  },
);

/**
 * Zapisuje wybór organizacji. `false`, gdy konto nie ma w niej członkostwa.
 *
 * Sprawdzenie jest tutaj, a nie tylko w endpoincie: to jedyne miejsce, które
 * zapisuje to pole, więc obce `organizationId` z żądania nie ma jak wejść
 * do bazy i zostać podane dalej jako „bieżąca organizacja".
 */
export async function setActiveOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true },
  });

  if (!membership) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { activeOrganizationId: organizationId },
  });

  return true;
}

/**
 * Rola zalogowanego w jego organizacji. NULL, gdy członkostwa już nie ma.
 *
 * `cache` z Reacta zwija to do jednego zapytania na żądanie — pyta o nie
 * i layout panelu, i każdy endpoint, i widok zespołu.
 */
export const membershipRole = cache(
  async (userId: string, organizationId: string): Promise<MembershipRole | null> => {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true },
    });

    return membership?.role ?? null;
  },
);

export type ApiTeamContext = ApiOwnerContext & { role: MembershipRole };

/**
 * Endpoint zarządzania zespołem: wymaga roli OWNER albo ADMIN w organizacji.
 *
 * Rola w organizacji to co innego niż `session.user.role`, które rozstrzyga
 * wyłącznie, do którego panelu użytkownik trafia po zalogowaniu. Zaproszony
 * współpracownik ma globalne OWNER (bo pracuje w panelu wynajmującego)
 * i członkostwo MEMBER — i to drugie decyduje, czy może zapraszać kolejnych.
 *
 * Nie da się tego wziąć z tokenu: rola w organizacji zmienia się bez ponownego
 * logowania, a token żyje trzydzieści dni. Odebranie uprawnień musi działać
 * od razu, więc czytamy je z bazy przy każdym żądaniu, które ich wymaga.
 */
export async function requireApiTeamManager(): Promise<
  ApiTeamContext | { response: ReturnType<typeof apiError> }
> {
  const result = await requireApiFeature("TEAM");
  if ("response" in result) return result;

  const role = await membershipRole(result.session.user.id, result.organizationId);

  if (role !== "OWNER" && role !== "ADMIN") {
    return { response: apiError("FORBIDDEN", result.d.panel.api.teamManagerOnly) };
  }

  return { ...result, role };
}

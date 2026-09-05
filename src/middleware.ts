import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfig } from "@/lib/auth/config";
import {
  isGuestOnlyPath,
  isProtectedPath,
  landingPathForRole,
  loginPathWithReturn,
  publicRoutes,
  ROUTES,
} from "@/lib/auth/routes";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  localeFromAcceptLanguage,
  localeFromPathname,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Middleware działa w runtime Edge, więc korzysta z `authConfig` — konfiguracji
 * bez Prismy i bcrypta. Odczytuje wyłącznie podpisany token sesji z ciasteczka.
 *
 * ⚠️ To jest warstwa nawigacyjna, nie bezpieczeństwa. Właściwa autoryzacja
 * (kto widzi które dane) siedzi w API routes i Server Componentach — patrz
 * `src/lib/auth/session.ts`.
 *
 * Druga rola: wybór wersji krajowej. Kolejność jest stała i celowa —
 * ciasteczko, potem `Accept-Language`, na końcu polski. Przekierowujemy
 * wyłącznie z gołego `rentixon.com` i z aliasów bez prefiksu; adres, który już
 * niesie kraj, zostaje nietknięty, żeby link wysłany komuś otwierał tę wersję,
 * którą nadawca widział.
 */
const { auth } = NextAuth(authConfig);

function preferredLocale(request: NextRequest): Locale {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  return localeFromAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // Goły adres domeny nie ma własnej treści — wysyła na wersję odwiedzającego.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(publicRoutes(preferredLocale(req)).home, req.nextUrl),
    );
  }

  /*
    Aliasy bez prefiksu (`/logowanie`, `/rejestracja`). Trzyma je konfiguracja
    NextAuth, która przyjmuje jedną stałą ścieżkę — a my chcemy, żeby błąd
    logowania przez Google wrócił do tej wersji językowej, z której użytkownik
    wyszedł. `search` przenosimy w całości, bo niesie `?error=` i adres powrotu.
  */
  if (pathname === ROUTES.loginAlias || pathname === ROUTES.registerAlias) {
    const routes = publicRoutes(preferredLocale(req));
    const target = pathname === ROUTES.loginAlias ? routes.login : routes.register;
    return NextResponse.redirect(new URL(`${target}${search}`, req.nextUrl));
  }

  // Zalogowany na stronie logowania/rejestracji → prosto do swojego panelu.
  if (isLoggedIn && isGuestOnlyPath(pathname)) {
    const target = landingPathForRole(req.auth?.user?.role);
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  if (!isLoggedIn && isProtectedPath(pathname)) {
    const target = loginPathWithReturn(preferredLocale(req), `${pathname}${search}`);
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  // Najemca nie ma czego szukać w panelu właściciela i odwrotnie.
  if (isLoggedIn) {
    const role = req.auth?.user?.role;

    if (role === "TENANT" && pathname.startsWith(ROUTES.ownerDashboard)) {
      return NextResponse.redirect(new URL(ROUTES.tenantDashboard, req.nextUrl));
    }

    if (role !== "TENANT" && pathname.startsWith(ROUTES.tenantDashboard)) {
      return NextResponse.redirect(new URL(ROUTES.ownerDashboard, req.nextUrl));
    }
  }

  /*
    Wersję przekazujemy w głąb nagłówkiem żądania, bo `layout.tsx` nie zna
    ścieżki, a ciasteczko ustawione niżej w tej samej odpowiedzi jeszcze nie
    istnieje przy renderowaniu. Bez tego pierwsze wejście na `/uk` z polskiej
    przeglądarki dałoby stronę po angielsku w polskim <html lang>.
  */
  const fromPath = localeFromPathname(pathname);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, fromPath ?? preferredLocale(req));

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  /*
    Wersję zapamiętujemy dopiero, gdy odwiedzający naprawdę ogląda jej stronę —
    nie przy zgadywaniu z nagłówka. Dzięki temu wejście z linku na `/uk`
    przestawia preferencję, a samo wykrycie po języku przeglądarki nie zamyka
    nikogo w wersji, której nie wybrał.
  */
  if (fromPath && req.cookies.get(LOCALE_COOKIE)?.value !== fromPath) {
    response.cookies.set(LOCALE_COOKIE, fromPath, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
});

export const config = {
  /**
   * Wszystko poza zasobami statycznymi i `/api/*`.
   * API celowo omijamy — endpointy zwracają JSON 401, a nie przekierowanie
   * na stronę logowania, bo będzie je konsumował także klient mobilny.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import {
  isGuestOnlyPath,
  isProtectedPath,
  landingPathForRole,
  ROUTES,
} from "@/lib/auth/routes";

/**
 * Middleware działa w runtime Edge, więc korzysta z `authConfig` — konfiguracji
 * bez Prismy i bcrypta. Odczytuje wyłącznie podpisany token sesji z ciasteczka.
 *
 * ⚠️ To jest warstwa nawigacyjna, nie bezpieczeństwa. Właściwa autoryzacja
 * (kto widzi które dane) siedzi w API routes i Server Componentach — patrz
 * `src/lib/auth/session.ts`.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // Zalogowany na stronie logowania/rejestracji → prosto do swojego panelu.
  if (isLoggedIn && isGuestOnlyPath(pathname)) {
    const target = landingPathForRole(req.auth?.user?.role);
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  if (!isLoggedIn && isProtectedPath(pathname)) {
    const loginUrl = new URL(ROUTES.login, req.nextUrl);
    loginUrl.searchParams.set("powrot", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
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

  return NextResponse.next();
});

export const config = {
  /**
   * Wszystko poza zasobami statycznymi i `/api/*`.
   * API celowo omijamy — endpointy zwracają JSON 401, a nie przekierowanie
   * na stronę logowania, bo będzie je konsumował także klient mobilny.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

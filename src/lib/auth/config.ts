import type { NextAuthConfig } from "next-auth";

import { ROUTES } from "./routes";

/**
 * Konfiguracja bez providerów i bez adaptera — świadomie.
 *
 * Middleware działa w runtime Edge, gdzie nie ma ani Prismy (silnik natywny),
 * ani bcrypta. Ten plik nie importuje żadnego z nich, więc może być użyty
 * i przez middleware, i przez pełną konfigurację w `./index.ts`, która
 * dokłada Credentials i PrismaAdapter po stronie Node.
 */
export const authConfig = {
  /*
    Aplikacja zawsze stoi za proxy — Vercel, Render, nginx — więc adres
    żądania przychodzi w nagłówku `X-Forwarded-Host`. Bez tego NextAuth
    odrzuca każde żądanie błędem `UntrustedHost`, a formularz logowania
    pokazuje wtedy ogólne „nie udało się zalogować", bo błąd wybucha zanim
    dojdzie do sprawdzania hasła.

    Ustawiamy to wprost, a nie zmienną `AUTH_TRUST_HOST`: to nie jest decyzja
    wdrożeniowa, tylko fakt o architekturze tej aplikacji. Zmienna, o której
    trzeba pamiętać przy każdym nowym środowisku, prędzej czy później zostanie
    pominięta — i objawi się dokładnie tym błędem.
  */
  trustHost: true,

  pages: {
    signIn: ROUTES.login,
    newUser: ROUTES.register,
    error: ROUTES.login,
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dni
    updateAge: 24 * 60 * 60, // odśwież token najwyżej raz na dobę
  },

  callbacks: {
    /**
     * Do tokenu wkładamy `role` i `organizationId`, żeby każdy API route mógł
     * zawęzić zapytanie do właściwej organizacji bez dodatkowego strzału
     * do bazy przy każdym żądaniu.
     */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.organizationId = user.organizationId ?? null;
      }

      // Po `useSession().update()` — np. gdy użytkownik zmieni nazwę.
      if (trigger === "update" && session?.user?.name) {
        token.name = session.user.name as string;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
      }
      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { consume, LIMITS, reset } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";

import { authConfig } from "./config";
import { InvalidCredentialsError, RateLimitError } from "./errors";
import { fakeVerify, verifyPassword } from "./password";
import { ensureOwnerOrganization } from "./register";

/**
 * Google wchodzi do listy providerów tylko z kompletem danych.
 *
 * Bez tego lokalne `.env` bez kluczy oznaczałoby, że każde kliknięcie przycisku
 * kończy się stroną błędu Auth.js zamiast czytelnego braku przycisku.
 */
const googleProviders =
  env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,

          /*
            Łączymy konto Google z istniejącym kontem o tym samym adresie.

            Bez tego właściciel, który założył konto hasłem, dostaje przy pierwszym
            logowaniu Google błąd `OAuthAccountNotLinked` i nie ma jak z niego
            wyjść — a to najczęstsza droga do tego przycisku.

            „Dangerous" w nazwie opcji dotyczy dostawców, którzy nie weryfikują
            adresu; Google weryfikuje. Zostaje jedno ryzyko: dopóki rejestracja
            hasłem nie potwierdza adresu mailem, ktoś może założyć konto na cudzy
            Gmail i zostać w nim po połączeniu. Domknie to dopiero weryfikacja
            e-maila przy rejestracji.
          */
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [];

/**
 * Pełna konfiguracja NextAuth — runtime Node.
 *
 * Adapter Prismy obsługuje logowanie Google (tabele `users` i `accounts`)
 * i tokeny weryfikacyjne. Samo logowanie hasłem go nie używa: provider
 * Credentials wymaga strategii JWT, więc sesje nie lądują w tabeli `sessions`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Nadbudowa nad callbackiem z `./config` (ten musi zostać wolny od Prismy,
     * bo używa go middleware w runtime Edge).
     *
     * Przy logowaniu Google `user` przychodzi prosto z adaptera, czyli jest
     * wierszem tabeli `users` — nie ma w nim `organizationId`, bo to pole
     * wynika z członkostwa. Dokładamy je jednym zapytaniem i tylko przy
     * logowaniu; kolejne odświeżenia tokenu czytają już gotową wartość.
     */
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);

      if (params.user && !token.organizationId) {
        const membership = await prisma.membership.findFirst({
          where: { userId: token.id },
          orderBy: { createdAt: "asc" },
          select: { organizationId: true },
        });

        token.organizationId = membership?.organizationId ?? null;
      }

      return token;
    },
  },

  events: {
    /**
     * Konto z Google powstaje bez organizacji — tworzymy ją tutaj, zanim
     * NextAuth wystawi token. Rejestracji hasłem to nie dotyczy: tam
     * organizacja powstaje w jednej transakcji z użytkownikiem.
     */
    async createUser({ user }) {
      if (user.id) await ensureOwnerOrganization(user.id);
    },
  },

  providers: [
    ...googleProviders,
    Credentials({
      id: "credentials",
      name: "E-mail i hasło",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Hasło", type: "password" },
      },

      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) throw new InvalidCredentialsError();

        const { email, password } = parsed.data;

        // Limit prób per konto — chroni przed zgadywaniem hasła jednego
        // użytkownika. Limitem per IP zajmuje się osobno endpoint rejestracji.
        const rate = await consume(`login:${email}`, LIMITS.login);
        if (!rate.success) throw new RateLimitError();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            passwordHash: true,
            memberships: {
              select: { organizationId: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        if (!user?.passwordHash) {
          // Konto nie istnieje albo założono je przez OAuth. Mimo to liczymy
          // bcrypta, żeby czas odpowiedzi nie zdradzał, który to przypadek.
          await fakeVerify(password);
          throw new InvalidCredentialsError();
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) throw new InvalidCredentialsError();

        await reset(`login:${email}`);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          organizationId: user.memberships[0]?.organizationId ?? null,
        };
      },
    }),
  ],
});

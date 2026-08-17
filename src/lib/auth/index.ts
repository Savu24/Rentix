import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { consume, LIMITS, reset } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";

import { authConfig } from "./config";
import { InvalidCredentialsError, RateLimitError } from "./errors";
import { fakeVerify, verifyPassword } from "./password";

/**
 * Pełna konfiguracja NextAuth — runtime Node.
 *
 * Adapter Prismy jest podpięty pod przyszłe logowanie OAuth i pod tokeny
 * weryfikacyjne. Samo logowanie hasłem go nie używa: provider Credentials
 * wymaga strategii JWT, więc sesje nie lądują w tabeli `sessions`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  providers: [
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
        const rate = consume(`login:${email}`, LIMITS.login);
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

        reset(`login:${email}`);

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

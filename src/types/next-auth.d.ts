import type { DefaultSession } from "next-auth";

/**
 * Rola powtórzona jako unia literałów, a nie zaimportowana z klienta Prismy.
 *
 * Ten plik deklaracji jest wczytywany przez TypeScript zanim `prisma generate`
 * zdąży cokolwiek wygenerować (np. na świeżym klonie repo), więc import
 * z `@/generated/prisma` rozsypywałby typy w całym projekcie.
 * Zgodność z enumem `UserRole` w schemacie pilnuje test w
 * `src/lib/auth/__tests__/roles.test.ts`.
 */
type AppRole = "OWNER" | "TENANT" | "ADMIN";

declare module "next-auth" {
  /** Obiekt zwracany z `authorize()` i wkładany do tokenu. */
  interface User {
    role: AppRole;
    organizationId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      /** NULL dla najemcy — najemca nie należy do organizacji właściciela. */
      organizationId: string | null;
    } & DefaultSession["user"];
  }
}

/**
 * Interfejs JWT mieszka w `@auth/core/jwt`; `next-auth/jwt` tylko go
 * re-eksportuje. Rozszerzenie samego `next-auth/jwt` nie scala się z oryginałem,
 * przez co `token.id` pozostawałby `unknown` w callbackach — stąd oba wpisy.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    organizationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    organizationId: string | null;
  }
}

export {};

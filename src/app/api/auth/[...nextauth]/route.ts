import { handlers } from "@/lib/auth";

/**
 * Endpointy NextAuth: /api/auth/signin, /callback, /session, /csrf, /signout.
 * Ochrona CSRF jest wbudowana — NextAuth wymaga tokenu `csrfToken`
 * przy każdym POST-cie i sam go rotuje.
 */
export const { GET, POST } = handlers;

// bcrypt i Prisma wymagają Node — nie da się tego obsłużyć na Edge.
export const runtime = "nodejs";

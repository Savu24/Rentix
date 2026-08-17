import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma 7 łączy się przez driver adapter — tu sterownik `pg`. Dzięki temu ten
 * sam kod działa na lokalnym Postgresie, na Render i na Neon/Supabase;
 * zmienia się wyłącznie DATABASE_URL.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Jeden klient na proces. W dev Next.js przeładowuje moduły przy każdej zmianie
 * pliku — bez cache'owania na `globalThis` każdy hot reload otwierałby nową pulę
 * połączeń i po kilkunastu zapisach baza odrzucałaby kolejne.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

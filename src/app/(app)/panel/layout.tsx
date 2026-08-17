import { MobileNav } from "@/components/panel/mobile-nav";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { requireOwnerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";

const PLAN_LABEL = { FREE: "Plan Free", PRO: "Plan Pro" } as const;

/**
 * Szkielet panelu właściciela.
 *
 * Sesja jest sprawdzana tutaj, więc każda podstrona panelu ma ją zagwarantowaną.
 * To nie zwalnia API routes z własnej autoryzacji — layout chroni widok,
 * a nie dane.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwnerSession("/panel");

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: session.user.organizationId },
    select: { plan: true },
  });

  const userInitials = initials(session.user.name);
  const userName = session.user.name ?? "Konto";

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar
        userName={userName}
        planLabel={PLAN_LABEL[subscription?.plan ?? "FREE"]}
        initials={userInitials}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar initials={userInitials} />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>

        <MobileNav />
      </div>
    </div>
  );
}

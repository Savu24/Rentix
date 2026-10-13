import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: { default: "Administracja", template: "%s · Administracja" },
  // Panel operatora nie ma czego szukać w wynikach wyszukiwania.
  robots: { index: false, follow: false },
};

/** Plakietka pod logo — mówi, w którym panelu się jest. */
function AdminBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-badge bg-highlight-soft px-2 py-1 text-[12px] font-semibold text-warn-ink">
      <ShieldCheck className="size-3.5" aria-hidden />
      Administracja
    </span>
  );
}

/**
 * Szkielet panelu administratora platformy (redesign/24-admin-*.svg).
 *
 * Osobne drzewo tras, a nie kolejna zakładka w `/panel`: tamten layout wymaga
 * członkostwa w organizacji i wszystko pod nim zawęża zapytania do jednego
 * `organizationId`. Panel administratora patrzy dokładnie odwrotnie —
 * na wszystkie konta naraz — więc dziedziczenie tamtych założeń tylko by
 * przeszkadzało.
 *
 * Ten sam system co panel klienta, ale z wyraźną plakietką „Administracja"
 * pod logo: pomylenie panelu, w którym zmienia się cudzy plan, z własnym
 * kończyłoby się zmianą wykonaną nie temu, komu trzeba.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await requireAdminSession();

  const signOut = (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label="Wyloguj"
        title="Wyloguj"
        className="flex size-9 items-center justify-center rounded-control text-side-ink-2 transition-colors hover:bg-side-active/50 hover:text-side-active-ink"
      >
        <LogOut className="size-[18px]" aria-hidden />
      </button>
    </form>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 z-40 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-side-line bg-linear-to-b from-side to-side-end lg:flex">
        <div className="flex flex-col gap-4 px-4 pt-6">
          <Link href="/admin" className="self-start rounded-btn px-2 focus-visible:outline-side-on">
            <Logo size="sm" onDark />
          </Link>
          <div className="px-2">
            <AdminBadge />
          </div>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-4">
          <AdminNav />
        </div>

        <div className="mx-4 mt-4 flex flex-col gap-2 border-t border-side-line py-3">
          <p className="truncate px-2 text-[12.5px] text-side-ink-2" title={actor.email ?? undefined}>
            {actor.email}
          </p>
          <div className="flex items-center gap-1">
            {/* Droga powrotna do własnego najmu — administrator prowadzi zwykle
                też swoje konto i przełącza się między nimi kilka razy dziennie. */}
            <Link
              href="/panel"
              className="flex h-9 flex-1 items-center gap-2.5 rounded-control px-2 text-sm font-semibold text-side-active-ink transition-colors hover:bg-side-active/50"
            >
              <ArrowLeft className="size-[18px] text-side-ink-2" aria-hidden />
              Mój panel
            </Link>
            <ThemeToggle className="border-transparent bg-transparent text-side-ink-2 hover:bg-side-active/50 hover:text-side-active-ink" />
            {signOut}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Telefon i tablet: pasek z logo, plakietką i rzędem sekcji. */}
        <header className="flex flex-col gap-3 bg-linear-to-b from-side to-side-end px-4 pt-4 pb-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="rounded-btn">
                <Logo size="sm" onDark />
              </Link>
              <AdminBadge />
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/panel"
                aria-label="Mój panel"
                className="flex size-9 items-center justify-center rounded-control text-side-ink-2 hover:bg-side-active/50"
              >
                <ArrowLeft className="size-[18px]" aria-hidden />
              </Link>
              {signOut}
            </div>
          </div>
          <AdminNav variant="top" />
        </header>

        <main className="mx-auto w-full max-w-[1096px] flex-1 px-4 pt-6 pb-10 sm:px-6 lg:px-12 lg:pt-10 lg:pb-12 xl:max-w-[1192px]">
          {children}
        </main>
      </div>
    </div>
  );
}

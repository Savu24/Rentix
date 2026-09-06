import { LayoutGrid, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: { default: "Administracja", template: "%s · Administracja" },
  // Panel operatora nie ma czego szukać w wynikach wyszukiwania.
  robots: { index: false, follow: false },
};

/**
 * Szkielet panelu administratora platformy.
 *
 * Osobne drzewo tras, a nie kolejna zakładka w `/panel`: tamten layout wymaga
 * członkostwa w organizacji i wszystko pod nim zawęża zapytania do jednego
 * `organizationId`. Panel administratora patrzy dokładnie odwrotnie —
 * na wszystkie konta naraz — więc dziedziczenie tamtych założeń tylko by
 * przeszkadzało.
 *
 * Nagłówek celowo wygląda inaczej niż w panelu klienta: drugi akcent i wyraźna
 * etykieta „Administracja". Pomylenie panelu, w którym zmienia się cudzy plan,
 * z własnym panelem kończyłoby się zmianą wykonaną nie temu, komu trzeba.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await requireAdminSession();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="rounded-btn">
            <Logo size="sm" />
          </Link>

          <span className="rounded-full bg-accent2-soft px-2.5 py-0.5 text-xs font-medium text-accent2">
            Administracja
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline">{actor.email}</span>

            <ThemeToggle />

            {/* Droga powrotna do własnego najmu — administrator prowadzi zwykle
                też swoje konto i przełącza się między nimi kilka razy dziennie. */}
            <Button asChild variant="secondary" size="sm">
              <Link href="/panel">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Mój panel</span>
              </Link>
            </Button>

            <form action={signOutAction}>
              <Button type="submit" variant="secondary" size="sm">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="sr-only">Wyloguj</span>
              </Button>
            </form>
          </div>

          <div className="w-full">
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

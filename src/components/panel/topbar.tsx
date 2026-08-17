import { Bell, LogOut } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";

export function Topbar({ initials }: { initials: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
      {/* Na desktopie logo siedzi w sidebarze, więc tu pojawia się tylko na małych ekranach. */}
      <div className="lg:hidden">
        <Logo size="sm" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-muted transition-colors hover:bg-surface-alt hover:text-fg"
          aria-label="Powiadomienia"
        >
          <Bell className="h-4 w-4" aria-hidden />
        </button>

        <span
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-accent2-soft text-[12.5px] font-semibold text-accent2 lg:flex"
          aria-hidden
        >
          {initials}
        </span>

        <form action={signOutAction}>
          <Button type="submit" variant="secondary" size="sm">
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Wyloguj</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
